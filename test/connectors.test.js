import assert from 'node:assert/strict'
import test from 'node:test'

import { INTEGRATIONS } from '../src/data.js'
import { CONNECTORS, connectorIds } from '../api/_connector-registry.js'
import statusHandler from '../api/integrations/status.js'
import authHandler from '../api/integrations/auth.js'
import callbackHandler from '../api/integrations/callback.js'
import actionHandler from '../api/integrations/action.js'
import webhookHandler from '../api/integrations/webhook.js'
import { runConnectorAction } from '../api/_connector-actions.js'

function response() {
  const headers = new Map()
  return {
    body: undefined,
    statusCode: 200,
    getHeader(name) { return headers.get(name.toLowerCase()) },
    setHeader(name, value) { headers.set(name.toLowerCase(), value) },
    hasHeader(name) { return headers.has(name.toLowerCase()) },
    status(code) { this.statusCode = code; return this },
    json(value) { this.body = value; return this },
    send(value) { this.body = value; return this },
    writeHead(code, values = {}) { this.statusCode = code; Object.entries(values).forEach(([name, value]) => this.setHeader(name, value)); return this },
    end() {},
  }
}

function cookieHeader(setCookie) {
  const values = Array.isArray(setCookie) ? setCookie : [setCookie]
  return values.map((value) => value.split(';', 1)[0]).join('; ')
}

async function withEnv(values, fn) {
  const old = Object.fromEntries(Object.keys(values).map((key) => [key, process.env[key]]))
  for (const [key, value] of Object.entries(values)) value == null ? delete process.env[key] : (process.env[key] = value)
  try { return await fn() } finally {
    for (const [key, value] of Object.entries(old)) value == null ? delete process.env[key] : (process.env[key] = value)
  }
}

test('every product integration has a concrete backend adapter contract', () => {
  const productIds = INTEGRATIONS.map(({ id }) => id).sort()
  assert.deepEqual(connectorIds().sort(), productIds)
  for (const id of productIds) {
    const definition = CONNECTORS[id]
    assert.ok(definition.env.length > 0, `${id} must declare required environment values`)
    assert.ok(definition.capabilities.length > 0, `${id} must declare capabilities`)
    assert.ok(definition.actions.length > 0, `${id} must declare actions`)
    assert.match(definition.docsUrl, /^https:\/\//)
  }
})

test('connector status reports all adapters and exact missing configuration', () => {
  const req = { headers: { host: 'localhost:4173' } }
  const res = response()
  statusHandler(req, res)
  assert.equal(res.statusCode, 200)
  assert.equal(Object.keys(res.body.connectors).length, INTEGRATIONS.length)
  assert.equal(res.body.connectors.gcal.appConfigured, false)
  assert.ok(res.body.connectors.gcal.missing.includes('GCAL_CLIENT_ID'))
  assert.equal(res.body.connectors.sms.authType, 'api_key')
  assert.equal(res.body.connectors.zillow.webhook, true)
})

test('generic OAuth auth and callback complete a real token exchange contract', async () => {
  await withEnv({
    GCAL_CLIENT_ID: 'calendar-client',
    GCAL_CLIENT_SECRET: 'calendar-secret',
    GCAL_REDIRECT_URI: 'https://example.test/api/integrations/callback?provider=gcal',
  }, async () => {
    const authRes = response()
    authHandler({ method: 'GET', query: { provider: 'gcal' } }, authRes)
    assert.equal(authRes.statusCode, 302)
    const location = new URL(authRes.getHeader('Location'))
    assert.equal(location.origin, 'https://accounts.google.com')
    assert.equal(location.searchParams.get('client_id'), 'calendar-client')
    assert.match(location.searchParams.get('scope'), /calendar\.events/)

    const originalFetch = globalThis.fetch
    globalThis.fetch = async () => ({ ok: true, status: 200, text: async () => JSON.stringify({ access_token: 'access', refresh_token: 'refresh', expires_in: 3600 }) })
    try {
      const callbackRes = response()
      await callbackHandler({
        method: 'GET',
        headers: { cookie: cookieHeader(authRes.getHeader('Set-Cookie')) },
        query: { provider: 'gcal', code: 'code', state: location.searchParams.get('state') },
      }, callbackRes)
      assert.equal(callbackRes.statusCode, 302)
      assert.equal(callbackRes.getHeader('Location'), '/?integration=gcal&connected=1')
      assert.ok(callbackRes.getHeader('Set-Cookie').some((value) => value.includes('msl_connector_gcal=')))
    } finally {
      globalThis.fetch = originalFetch
    }
  })
})

test('actions fail closed when server credentials are absent', async () => {
  await withEnv({ ZAPIER_WEBHOOK_URL: null, INTEGRATION_ACTIONS_ENABLED: 'true' }, async () => {
    const res = response()
    await actionHandler({ method: 'POST', headers: { origin: 'https://example.test', host: 'example.test' }, query: {}, body: { provider: 'zapier', action: 'trigger', payload: {} } }, res)
    assert.equal(res.statusCode, 503)
    assert.ok(res.body.missing.includes('ZAPIER_WEBHOOK_URL'))
  })
})

test('live provider actions are disabled by default outside local development', async () => {
  await withEnv({ INTEGRATION_ACTIONS_ENABLED: null, INTEGRATION_API_SECRET: null, NODE_ENV: 'production' }, async () => {
    const res = response()
    await actionHandler({ method: 'POST', headers: { origin: 'https://example.test', host: 'example.test' }, query: {}, body: { provider: 'zapier', action: 'trigger', payload: {} } }, res)
    assert.equal(res.statusCode, 403)
  })
})

test('signed Zillow webhooks normalize into the common event boundary', async () => {
  await withEnv({ ZILLOW_WEBHOOK_SECRET: 'zillow-secret', INTEGRATION_EVENT_SINK_URL: null }, async () => {
    const body = { leadId: 'lead-1', name: 'Test Lead' }
    const rawBody = Buffer.from(JSON.stringify(body))
    const res = response()
    await webhookHandler({
      method: 'POST',
      url: '/api/integrations/webhook?provider=zillow',
      query: { provider: 'zillow' },
      headers: { 'content-type': 'application/json', 'x-msl-webhook-secret': 'zillow-secret' },
      rawBody,
      body,
    }, res)
    assert.equal(res.statusCode, 202)
    assert.equal(res.body.eventId, 'lead-1')
    assert.equal(res.body.delivered, false)
  })
})

test('webhook signatures fail closed when the provider secret is unset', async () => {
  await withEnv({ TWILIO_AUTH_TOKEN: null, META_CLIENT_SECRET: null, DROPBOX_CLIENT_SECRET: null }, async () => {
    for (const [provider, header] of [['sms', 'x-twilio-signature'], ['facebook', 'x-hub-signature-256'], ['dropbox', 'x-dropbox-signature']]) {
      const body = { forged: true }
      const res = response()
      await webhookHandler({
        method: 'POST',
        url: `/api/integrations/webhook?provider=${provider}`,
        query: { provider },
        headers: { 'content-type': 'application/json', [header]: 'sha256=forged' },
        rawBody: Buffer.from(JSON.stringify(body)),
        body,
      }, res)
      assert.equal(res.statusCode, 401, `${provider} must reject a forged signature when its secret is unset`)
    }
  })
})

test('Twilio SMS adapter maps the common action payload to the provider API', async () => {
  await withEnv({ TWILIO_ACCOUNT_SID: 'AC123', TWILIO_AUTH_TOKEN: 'secret', TWILIO_PHONE_NUMBER: '+16015550100' }, async () => {
    const originalFetch = globalThis.fetch
    let request
    globalThis.fetch = async (url, options) => {
      request = { url, options }
      return { ok: true, status: 201, text: async () => JSON.stringify({ sid: 'SM123' }) }
    }
    try {
      const data = await runConnectorAction({}, response(), 'sms', 'send_sms', { to: '+16015550101', body: 'Hello' })
      assert.equal(data.sid, 'SM123')
      assert.match(request.url, /Accounts\/AC123\/Messages\.json$/)
      assert.match(request.options.body.toString(), /Body=Hello/)
      assert.match(request.options.headers.Authorization, /^Basic /)
    } finally { globalThis.fetch = originalFetch }
  })
})

test('Google Calendar adapter uses server-managed tokens without exposing them', async () => {
  await withEnv({ CONNECTOR_GCAL_ACCESS_TOKEN: 'calendar-access' }, async () => {
    const originalFetch = globalThis.fetch
    let request
    globalThis.fetch = async (url, options) => {
      request = { url, options }
      return { ok: true, status: 200, text: async () => JSON.stringify({ items: [] }) }
    }
    try {
      const data = await runConnectorAction({ headers: {} }, response(), 'gcal', 'list_events', { max: 10 })
      assert.deepEqual(data.items, [])
      assert.match(request.url, /calendar\/v3\/calendars\/primary\/events/)
      assert.equal(request.options.headers.Authorization, 'Bearer calendar-access')
    } finally { globalThis.fetch = originalFetch }
  })
})
