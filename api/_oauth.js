import { randomBytes, timingSafeEqual } from 'node:crypto'

const LEGACY_TOKEN_COOKIE = {
  outlook: 'msl_outlook_refresh',
  gmail: 'msl_google_refresh',
}

const LEGACY_STATE_COOKIE = {
  outlook: 'msl_outlook_state',
  gmail: 'msl_google_state',
}

const safeProvider = (provider) => String(provider || '').toLowerCase().replace(/[^a-z0-9_-]/g, '')
const tokenCookieName = (provider) => LEGACY_TOKEN_COOKIE[provider] || `msl_connector_${safeProvider(provider)}`
const stateCookieName = (provider) => LEGACY_STATE_COOKIE[provider] || `msl_${safeProvider(provider)}_state`

function cookies(req) {
  return Object.fromEntries(
    String(req?.headers?.cookie || '')
      .split(';')
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const i = part.indexOf('=')
        const key = i === -1 ? part : part.slice(0, i)
        const value = i === -1 ? '' : part.slice(i + 1)
        try {
          return [key, decodeURIComponent(value)]
        } catch {
          return [key, value]
        }
      }),
  )
}

function cookie(name, value, { maxAge = 60 * 60 * 24 * 90 } = {}) {
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    'Path=/api',
    `Max-Age=${maxAge}`,
    'HttpOnly',
    'SameSite=Lax',
  ]
  // Vite's local API runtime uses plain HTTP. Production and tests retain the
  // Secure flag; provider redirects should always use HTTPS outside local dev.
  if (process.env.NODE_ENV !== 'development') parts.splice(4, 0, 'Secure')
  return parts.join('; ')
}

function appendCookie(res, value) {
  const current = res.getHeader('Set-Cookie')
  const next = current ? (Array.isArray(current) ? [...current, value] : [current, value]) : value
  res.setHeader('Set-Cookie', next)
}

export function beginOAuth(res, provider) {
  const state = randomBytes(24).toString('hex')
  appendCookie(res, cookie(stateCookieName(provider), state, { maxAge: 60 * 10 }))
  return state
}

export function validOAuthState(req, provider, received) {
  const expected = cookies(req)[stateCookieName(provider)]
  if (!expected || !received) return false
  const a = Buffer.from(expected)
  const b = Buffer.from(String(received))
  return a.length === b.length && timingSafeEqual(a, b)
}

export function clearOAuthState(res, provider) {
  appendCookie(res, cookie(stateCookieName(provider), '', { maxAge: 0 }))
}

/* PKCE: store the one-time code_verifier next to the state (same 10-min TTL).
   Used only by connectors with definition.pkce (Canva, TikTok). */
const pkceCookieName = (provider) => `msl_${safeProvider(provider)}_pkce`
export function setPkceVerifier(res, provider, verifier) {
  appendCookie(res, cookie(pkceCookieName(provider), verifier, { maxAge: 60 * 10 }))
}
export function getPkceVerifier(req, provider) {
  return cookies(req)[pkceCookieName(provider)] || null
}
export function clearPkceVerifier(res, provider) {
  appendCookie(res, cookie(pkceCookieName(provider), '', { maxAge: 0 }))
}

export function browserRefreshToken(req, provider) {
  return cookies(req)[tokenCookieName(provider)] || null
}

export function setRefreshToken(res, provider, token) {
  appendCookie(res, cookie(tokenCookieName(provider), token))
}

export function clearRefreshToken(res, provider) {
  appendCookie(res, cookie(tokenCookieName(provider), '', { maxAge: 0 }))
}

export function refreshTokenSource(req, provider, serverToken) {
  if (browserRefreshToken(req, provider)) return 'browser'
  if (serverToken) return 'server'
  return null
}

export function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

export function browserOAuthTokens(req, provider) {
  const encoded = cookies(req)[tokenCookieName(provider)]
  if (!encoded) return null
  // Gmail/Outlook legacy cookies contain a raw refresh token.
  if (LEGACY_TOKEN_COOKIE[provider]) return { refresh_token: encoded }
  try {
    return JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'))
  } catch {
    return null
  }
}

export function setOAuthTokens(res, provider, tokens) {
  // Persist only what's needed to mint future access tokens; dropping the large
  // id_token keeps the cookie comfortably under the ~4KB browser limit.
  const persist = { ...(tokens || {}) }
  delete persist.id_token
  const value = Buffer.from(JSON.stringify(persist), 'utf8').toString('base64url')
  const expires = Number(tokens?.refresh_token_expires_in || 60 * 60 * 24 * 90)
  // floor at 1 day so a small refresh_token_expires_in can't clamp the cookie to
  // the 5-minute minimum and silently drop the connection mid-use
  appendCookie(res, cookie(tokenCookieName(provider), value, { maxAge: Math.min(Math.max(expires, 60 * 60 * 24), 60 * 60 * 24 * 180) }))
}

export function clearOAuthTokens(res, provider) {
  clearRefreshToken(res, provider)
}
