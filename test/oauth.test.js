import assert from 'node:assert/strict'
import test from 'node:test'

import {
  beginOAuth,
  browserRefreshToken,
  clearRefreshToken,
  escapeHtml,
  setRefreshToken,
  validOAuthState,
} from '../api/_oauth.js'
import gmailAuth from '../api/gmail/_auth.js'
import gmailCallback from '../api/gmail/_callback.js'
import health from '../api/health.js'
import outlookAuth from '../api/outlook/_auth.js'

function response() {
  const headers = new Map()
  return {
    body: undefined,
    ended: false,
    statusCode: 200,
    getHeader(name) {
      return headers.get(name.toLowerCase())
    },
    setHeader(name, value) {
      headers.set(name.toLowerCase(), value)
    },
    status(code) {
      this.statusCode = code
      return this
    },
    json(value) {
      this.body = value
      return this
    },
    send(value) {
      this.body = value
      return this
    },
    writeHead(code, values = {}) {
      this.statusCode = code
      Object.entries(values).forEach(([name, value]) => this.setHeader(name, value))
      return this
    },
    end() {
      this.ended = true
    },
  }
}

function requestCookie(setCookie) {
  const value = Array.isArray(setCookie) ? setCookie[0] : setCookie
  return value.split(';', 1)[0]
}

function withEnv(values, fn) {
  const previous = Object.fromEntries(Object.keys(values).map((key) => [key, process.env[key]]))
  Object.entries(values).forEach(([key, value]) => {
    if (value == null) delete process.env[key]
    else process.env[key] = value
  })
  return Promise.resolve(fn()).finally(() => {
    Object.entries(previous).forEach(([key, value]) => {
      if (value == null) delete process.env[key]
      else process.env[key] = value
    })
  })
}

test('OAuth cookies are HTTP-only, secure, and state-validated', () => {
  const res = response()
  const state = beginOAuth(res, 'gmail')
  const setCookie = res.getHeader('Set-Cookie')

  assert.match(setCookie, /msl_google_state=/)
  assert.match(setCookie, /HttpOnly/)
  assert.match(setCookie, /Secure/)
  assert.match(setCookie, /SameSite=Lax/)
  assert.equal(validOAuthState({ headers: { cookie: requestCookie(setCookie) } }, 'gmail', state), true)
  assert.equal(validOAuthState({ headers: { cookie: requestCookie(setCookie) } }, 'gmail', 'wrong'), false)
})

test('refresh-token cookies can be read and cleared by server routes', () => {
  const res = response()
  setRefreshToken(res, 'outlook', 'refresh-value')
  const req = { headers: { cookie: requestCookie(res.getHeader('Set-Cookie')) } }

  assert.equal(browserRefreshToken(req, 'outlook'), 'refresh-value')
  const clearRes = response()
  clearRefreshToken(clearRes, 'outlook')
  assert.match(clearRes.getHeader('Set-Cookie'), /Max-Age=0/)
})

test('OAuth error details are safe to render in callback pages', () => {
  assert.equal(escapeHtml('<script>alert("x")</script>'), '&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;')
})

test('Gmail auth redirects to Google with real OAuth state', async () => {
  await withEnv(
    {
      GOOGLE_CLIENT_ID: 'google-client',
      GOOGLE_CLIENT_SECRET: 'google-secret',
      GOOGLE_REDIRECT_URI: 'https://example.test/api/gmail/callback',
    },
    () => {
      const res = response()
      gmailAuth({ method: 'GET' }, res)
      const location = new URL(res.getHeader('Location'))

      assert.equal(res.statusCode, 302)
      assert.equal(location.origin, 'https://accounts.google.com')
      assert.equal(location.searchParams.get('client_id'), 'google-client')
      assert.equal(location.searchParams.get('access_type'), 'offline')
      assert.ok(location.searchParams.get('state'))
      assert.match(res.getHeader('Set-Cookie'), /msl_google_state=/)
    },
  )
})

test('Outlook auth redirects to the configured Microsoft tenant with OAuth state', async () => {
  await withEnv(
    {
      OUTLOOK_CLIENT_ID: 'outlook-client',
      OUTLOOK_CLIENT_SECRET: 'outlook-secret',
      OUTLOOK_TENANT: 'tenant-id',
      OUTLOOK_REDIRECT_URI: 'https://example.test/api/outlook/callback',
    },
    () => {
      const res = response()
      outlookAuth({ method: 'GET' }, res)
      const location = new URL(res.getHeader('Location'))

      assert.equal(res.statusCode, 302)
      assert.equal(location.origin, 'https://login.microsoftonline.com')
      assert.equal(location.pathname, '/tenant-id/oauth2/v2.0/authorize')
      assert.equal(location.searchParams.get('client_id'), 'outlook-client')
      assert.match(location.searchParams.get('scope'), /Mail\.Read/)
      assert.ok(location.searchParams.get('state'))
      assert.match(res.getHeader('Set-Cookie'), /msl_outlook_state=/)
    },
  )
})

test('Gmail callback exchanges the code and stores the refresh token', async () => {
  await withEnv(
    {
      GOOGLE_CLIENT_ID: 'google-client',
      GOOGLE_CLIENT_SECRET: 'google-secret',
      GOOGLE_REDIRECT_URI: 'https://example.test/api/gmail/callback',
    },
    async () => {
      const startRes = response()
      const state = beginOAuth(startRes, 'gmail')
      const req = {
        headers: { cookie: requestCookie(startRes.getHeader('Set-Cookie')) },
        query: { code: 'auth-code', state },
      }
      const res = response()
      const originalFetch = globalThis.fetch
      globalThis.fetch = async () => ({ ok: true, json: async () => ({ refresh_token: 'google-refresh' }) })
      try {
        await gmailCallback(req, res)
      } finally {
        globalThis.fetch = originalFetch
      }

      assert.equal(res.statusCode, 302)
      assert.equal(res.getHeader('Location'), '/?integration=gmail&connected=1')
      assert.ok(res.getHeader('Set-Cookie').some((value) => value.includes('msl_google_refresh=google-refresh')))
    },
  )
})

test('health reports configured browser OAuth connections', async () => {
  await withEnv(
    {
      GOOGLE_CLIENT_ID: 'google-client',
      GOOGLE_CLIENT_SECRET: 'google-secret',
      GOOGLE_REDIRECT_URI: 'https://example.test/api/gmail/callback',
      GOOGLE_REFRESH_TOKEN: null,
      OUTLOOK_CLIENT_ID: null,
      OUTLOOK_CLIENT_SECRET: null,
      OUTLOOK_TENANT: null,
      OUTLOOK_REDIRECT_URI: null,
      OUTLOOK_REFRESH_TOKEN: null,
    },
    () => {
      const tokenRes = response()
      setRefreshToken(tokenRes, 'gmail', 'google-refresh')
      const req = { headers: { cookie: requestCookie(tokenRes.getHeader('Set-Cookie')) } }
      const res = response()
      health(req, res)

      assert.equal(res.body.provider, 'gmail')
      assert.equal(res.body.providers.gmail.appConfigured, true)
      assert.equal(res.body.providers.gmail.connected, true)
      assert.equal(res.body.providers.gmail.tokenSource, 'browser')
      assert.equal(res.body.providers.outlook.connected, false)
      assert.equal(res.getHeader('Cache-Control'), 'no-store')
    },
  )
})
