import { createHash } from 'node:crypto'
import { connectorAccessToken } from './_connector-oauth.js'
import { connector } from './_connector-registry.js'

const requireFields = (payload, fields) => {
  const missing = fields.filter((field) => payload?.[field] == null || payload[field] === '')
  if (missing.length) throw new Error(`Missing required fields: ${missing.join(', ')}`)
}

async function jsonRequest(url, options = {}) {
  const response = await fetch(url, options)
  const text = await response.text()
  let body
  try { body = text ? JSON.parse(text) : {} } catch { body = { text } }
  if (!response.ok) throw new Error(body?.error?.message || body?.fault?.error?.[0]?.message || body?.message || body?.text || `Provider request failed (${response.status})`)
  return body
}

const bearer = (token, extra = {}) => ({ Authorization: `Bearer ${token}`, Accept: 'application/json', ...extra })
const twilioAuth = () => `Basic ${Buffer.from(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`).toString('base64')}`

async function googleCalendar(action, payload, tokens) {
  if (action === 'list_events') {
    const params = new URLSearchParams({
      singleEvents: 'true',
      orderBy: 'startTime',
      maxResults: String(Math.min(Number(payload.max) || 50, 250)),
      timeMin: payload.timeMin || new Date().toISOString(),
    })
    if (payload.timeMax) params.set('timeMax', payload.timeMax)
    return jsonRequest(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(payload.calendarId || 'primary')}/events?${params}`, {
      headers: bearer(tokens.access_token),
    })
  }
  if (action === 'create_event') {
    requireFields(payload, ['summary', 'start', 'end'])
    return jsonRequest(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(payload.calendarId || 'primary')}/events`, {
      method: 'POST',
      headers: bearer(tokens.access_token, { 'Content-Type': 'application/json' }),
      body: JSON.stringify({
        summary: payload.summary,
        description: payload.description,
        location: payload.location,
        start: typeof payload.start === 'string' ? { dateTime: payload.start } : payload.start,
        end: typeof payload.end === 'string' ? { dateTime: payload.end } : payload.end,
        attendees: payload.attendees,
      }),
    })
  }
  throw new Error('Unsupported Google Calendar action')
}

async function meta(action, payload, tokens, provider) {
  const graph = 'https://graph.facebook.com/v22.0'
  if (provider === 'facebook' && action === 'list_pages') {
    return jsonRequest(`${graph}/me/accounts?fields=id,name,access_token&access_token=${encodeURIComponent(tokens.access_token)}`)
  }
  if (provider === 'facebook' && action === 'list_leads') {
    requireFields(payload, ['formId'])
    return jsonRequest(`${graph}/${encodeURIComponent(payload.formId)}/leads?fields=id,created_time,field_data&access_token=${encodeURIComponent(payload.pageAccessToken || tokens.access_token)}`)
  }
  if (provider === 'instagram' && action === 'list_conversations') {
    requireFields(payload, ['pageId'])
    return jsonRequest(`${graph}/${encodeURIComponent(payload.pageId)}/conversations?platform=instagram&fields=id,participants,updated_time&access_token=${encodeURIComponent(payload.pageAccessToken || tokens.access_token)}`)
  }
  throw new Error(`Unsupported ${provider} action`)
}

async function businessProfile(action, payload, tokens) {
  const headers = bearer(tokens.access_token)
  if (action === 'list_accounts') return jsonRequest('https://mybusinessaccountmanagement.googleapis.com/v1/accounts', { headers })
  if (action === 'list_locations') {
    requireFields(payload, ['accountId'])
    const readMask = payload.readMask || 'name,title,storeCode,websiteUri,phoneNumbers,categories'
    return jsonRequest(`https://mybusinessbusinessinformation.googleapis.com/v1/${payload.accountId}/locations?readMask=${encodeURIComponent(readMask)}`, { headers })
  }
  if (action === 'list_reviews') {
    requireFields(payload, ['accountId', 'locationId'])
    return jsonRequest(`https://mybusiness.googleapis.com/v4/${payload.accountId}/${payload.locationId}/reviews`, { headers })
  }
  throw new Error('Unsupported Google Business Profile action')
}

async function twilio(action, payload) {
  const sid = process.env.TWILIO_ACCOUNT_SID
  const form = new URLSearchParams()
  let path = 'Messages.json'
  if (action === 'send_sms') {
    requireFields(payload, ['to', 'body'])
    form.set('From', payload.from || process.env.TWILIO_PHONE_NUMBER)
    form.set('To', payload.to)
    form.set('Body', payload.body)
  } else if (action === 'send_whatsapp') {
    requireFields(payload, ['to', 'body'])
    form.set('From', `whatsapp:${String(payload.from || process.env.TWILIO_WHATSAPP_NUMBER).replace(/^whatsapp:/, '')}`)
    form.set('To', `whatsapp:${String(payload.to).replace(/^whatsapp:/, '')}`)
    form.set('Body', payload.body)
  } else if (action === 'place_call') {
    requireFields(payload, ['to'])
    path = 'Calls.json'
    form.set('From', payload.from || process.env.TWILIO_PHONE_NUMBER)
    form.set('To', payload.to)
    form.set('Url', payload.twimlUrl || process.env.TWILIO_VOICE_WEBHOOK_URL)
    if (payload.statusCallback) form.set('StatusCallback', payload.statusCallback)
  } else throw new Error('Unsupported Twilio action')
  return jsonRequest(`https://api.twilio.com/2010-04-01/Accounts/${sid}/${path}`, {
    method: 'POST',
    headers: { Authorization: twilioAuth(), 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form,
  })
}

async function docusign(action, payload, tokens) {
  const accountId = payload.accountId || process.env.DOCUSIGN_ACCOUNT_ID
  const base = process.env.DOCUSIGN_API_BASE || 'https://demo.docusign.net/restapi/v2.1'
  if (action === 'create_envelope') {
    requireFields(payload, ['envelope'])
    return jsonRequest(`${base}/accounts/${encodeURIComponent(accountId)}/envelopes`, {
      method: 'POST',
      headers: bearer(tokens.access_token, { 'Content-Type': 'application/json' }),
      body: JSON.stringify(payload.envelope),
    })
  }
  if (action === 'get_envelope') {
    requireFields(payload, ['envelopeId'])
    return jsonRequest(`${base}/accounts/${encodeURIComponent(accountId)}/envelopes/${encodeURIComponent(payload.envelopeId)}`, {
      headers: bearer(tokens.access_token),
    })
  }
  throw new Error('Unsupported DocuSign action')
}

async function dropbox(action, payload, tokens) {
  if (action === 'list_folder') {
    return jsonRequest('https://api.dropboxapi.com/2/files/list_folder', {
      method: 'POST',
      headers: bearer(tokens.access_token, { 'Content-Type': 'application/json' }),
      body: JSON.stringify({ path: payload.path || '', recursive: !!payload.recursive }),
    })
  }
  if (action === 'upload_file') {
    requireFields(payload, ['path', 'contentBase64'])
    const response = await fetch('https://content.dropboxapi.com/2/files/upload', {
      method: 'POST',
      headers: bearer(tokens.access_token, {
        'Content-Type': 'application/octet-stream',
        'Dropbox-API-Arg': JSON.stringify({ path: payload.path, mode: payload.mode || 'add', autorename: true }),
      }),
      body: Buffer.from(payload.contentBase64, 'base64'),
    })
    const text = await response.text()
    let body
    try { body = text ? JSON.parse(text) : {} } catch { body = { message: text } }
    if (!response.ok) throw new Error(body.error_summary || body.message || `Dropbox upload failed (${response.status})`)
    return body
  }
  throw new Error('Unsupported Dropbox action')
}

async function quickbooks(action, payload, tokens) {
  const realmId = payload.realmId || tokens.realmId || process.env.CONNECTOR_QUICKBOOKS_REALM_ID
  if (!realmId) throw new Error('QuickBooks realmId is required; reconnect or set CONNECTOR_QUICKBOOKS_REALM_ID')
  const base = process.env.QUICKBOOKS_API_BASE || 'https://quickbooks.api.intuit.com'
  const root = `${base}/v3/company/${encodeURIComponent(realmId)}`
  if (action === 'query') {
    requireFields(payload, ['query'])
    return jsonRequest(`${root}/query?query=${encodeURIComponent(payload.query)}&minorversion=75`, { headers: bearer(tokens.access_token) })
  }
  if (action === 'create_customer') {
    requireFields(payload, ['customer'])
    return jsonRequest(`${root}/customer?minorversion=75`, {
      method: 'POST',
      headers: bearer(tokens.access_token, { 'Content-Type': 'application/json' }),
      body: JSON.stringify(payload.customer),
    })
  }
  throw new Error('Unsupported QuickBooks action')
}

async function mailchimp(action, payload, tokens) {
  const metadata = await jsonRequest('https://login.mailchimp.com/oauth2/metadata', { headers: bearer(tokens.access_token) })
  const base = metadata.api_endpoint
  if (!base) throw new Error('Mailchimp metadata did not return an API endpoint')
  if (action === 'list_audiences') return jsonRequest(`${base}/3.0/lists?count=${Math.min(Number(payload.count) || 20, 100)}`, { headers: bearer(tokens.access_token) })
  if (action === 'upsert_contact') {
    requireFields(payload, ['listId', 'email'])
    const hash = createHash('md5').update(String(payload.email).trim().toLowerCase()).digest('hex')
    return jsonRequest(`${base}/3.0/lists/${encodeURIComponent(payload.listId)}/members/${hash}`, {
      method: 'PUT',
      headers: bearer(tokens.access_token, { 'Content-Type': 'application/json' }),
      body: JSON.stringify({ email_address: payload.email, status_if_new: payload.status || 'subscribed', merge_fields: payload.mergeFields || {} }),
    })
  }
  throw new Error('Unsupported Mailchimp action')
}

export async function runConnectorAction(req, res, provider, action, payload = {}) {
  const definition = connector(provider)
  if (!definition) throw new Error('Unknown connector')
  if (!definition.actions.includes(action)) throw new Error(`${action} is not supported by ${definition.name}`)

  if (['sms', 'whatsapp', 'dialer'].includes(provider)) return twilio(action, payload)
  if (provider === 'zapier') {
    if (action !== 'trigger') throw new Error('Unsupported Zapier action')
    return jsonRequest(process.env.ZAPIER_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(process.env.ZAPIER_WEBHOOK_SECRET ? { Authorization: `Bearer ${process.env.ZAPIER_WEBHOOK_SECRET}` } : {}) },
      body: JSON.stringify(payload),
    })
  }
  if (provider === 'zillow') throw new Error('Zillow is inbound-only; send leads to the connector webhook')
  if (definition.native) throw new Error(`${definition.name} uses its dedicated API routes`)

  const tokens = await connectorAccessToken(req, res, provider)
  if (provider === 'gcal') return googleCalendar(action, payload, tokens)
  if (provider === 'facebook' || provider === 'instagram') return meta(action, payload, tokens, provider)
  if (provider === 'gbp') return businessProfile(action, payload, tokens)
  if (provider === 'linkedin' && action === 'get_profile') return jsonRequest('https://api.linkedin.com/v2/userinfo', { headers: bearer(tokens.access_token) })
  if (provider === 'docusign') return docusign(action, payload, tokens)
  if (provider === 'dropbox') return dropbox(action, payload, tokens)
  if (provider === 'quickbooks') return quickbooks(action, payload, tokens)
  if (provider === 'mailchimp') return mailchimp(action, payload, tokens)
  throw new Error(`No action adapter is registered for ${definition.name}`)
}
