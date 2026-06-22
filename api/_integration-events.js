import { createHmac, timingSafeEqual } from 'node:crypto'

const safeEqual = (left, right) => {
  const a = Buffer.from(String(left || ''))
  const b = Buffer.from(String(right || ''))
  return a.length === b.length && timingSafeEqual(a, b)
}

const hmac = (algorithm, secret, value, encoding = 'hex') => createHmac(algorithm, secret).update(value).digest(encoding)

function publicUrl(req) {
  const proto = req.headers['x-forwarded-proto'] || 'https'
  const host = req.headers['x-forwarded-host'] || req.headers.host
  return `${proto}://${host}${req.url}`
}

export function verifyWebhook(req, provider, rawBody, body = {}) {
  if (provider === 'facebook' || provider === 'instagram') {
    const signature = String(req.headers['x-hub-signature-256'] || '').replace(/^sha256=/, '')
    return safeEqual(signature, hmac('sha256', process.env.META_CLIENT_SECRET || '', rawBody))
  }
  if (['sms', 'whatsapp', 'dialer'].includes(provider)) {
    const values = Object.entries(body || {}).sort(([a], [b]) => a.localeCompare(b)).map(([key, value]) => `${key}${value}`).join('')
    const expected = hmac('sha1', process.env.TWILIO_AUTH_TOKEN || '', `${publicUrl(req)}${values}`, 'base64')
    return safeEqual(req.headers['x-twilio-signature'], expected)
  }
  if (provider === 'dropbox') {
    return safeEqual(req.headers['x-dropbox-signature'], hmac('sha256', process.env.DROPBOX_CLIENT_SECRET || '', rawBody))
  }
  if (provider === 'docusign' && process.env.DOCUSIGN_CONNECT_SECRET) {
    return safeEqual(req.headers['x-docusign-signature-1'], hmac('sha256', process.env.DOCUSIGN_CONNECT_SECRET, rawBody, 'base64'))
  }
  if (provider === 'quickbooks' && process.env.QUICKBOOKS_WEBHOOK_VERIFIER) {
    return safeEqual(req.headers['intuit-signature'], hmac('sha256', process.env.QUICKBOOKS_WEBHOOK_VERIFIER, rawBody, 'base64'))
  }
  const secrets = {
    zillow: process.env.ZILLOW_WEBHOOK_SECRET,
    zapier: process.env.ZAPIER_WEBHOOK_SECRET,
    linkedin: process.env.LINKEDIN_WEBHOOK_SECRET,
    mailchimp: process.env.MAILCHIMP_WEBHOOK_SECRET,
  }
  const secret = secrets[provider]
  if (!secret) return false
  const supplied = req.headers['x-msl-webhook-secret'] || String(req.headers.authorization || '').replace(/^Bearer\s+/i, '')
  return safeEqual(supplied, secret)
}

export function normalizeIntegrationEvent(provider, body, headers = {}) {
  const now = new Date().toISOString()
  if (provider === 'sms' || provider === 'whatsapp') {
    return {
      provider,
      type: body.MessageStatus ? 'message.status' : 'message.received',
      externalId: body.MessageSid,
      occurredAt: now,
      data: { from: body.From, to: body.To, body: body.Body, status: body.MessageStatus, mediaCount: Number(body.NumMedia || 0) },
    }
  }
  if (provider === 'dialer') {
    return {
      provider,
      type: 'call.status',
      externalId: body.CallSid,
      occurredAt: now,
      data: { from: body.From, to: body.To, status: body.CallStatus, duration: body.CallDuration },
    }
  }
  if (provider === 'facebook' || provider === 'instagram') {
    return { provider, type: 'meta.webhook', externalId: body.entry?.[0]?.id, occurredAt: now, data: body }
  }
  if (provider === 'zillow') {
    return { provider, type: 'lead.received', externalId: body.id || body.leadId, occurredAt: body.createdAt || now, data: body }
  }
  return {
    provider,
    type: `${provider}.webhook`,
    externalId: body.id || body.eventId || headers['x-request-id'] || null,
    occurredAt: now,
    data: body,
  }
}

/* Production port boundary: point this at a queue, database ingestion route,
   or workflow service without changing any provider webhook handler. */
export async function deliverIntegrationEvent(event) {
  const sink = process.env.INTEGRATION_EVENT_SINK_URL
  if (!sink) return { delivered: false, reason: 'No INTEGRATION_EVENT_SINK_URL configured', event }
  const response = await fetch(sink, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(process.env.INTEGRATION_EVENT_SINK_SECRET ? { Authorization: `Bearer ${process.env.INTEGRATION_EVENT_SINK_SECRET}` } : {}),
    },
    body: JSON.stringify(event),
  })
  if (!response.ok) throw new Error(`Integration event sink failed (${response.status})`)
  return { delivered: true, event }
}
