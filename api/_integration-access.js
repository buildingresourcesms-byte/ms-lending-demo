import { timingSafeEqual } from 'node:crypto'

const safeEqual = (left, right) => {
  const a = Buffer.from(String(left || ''))
  const b = Buffer.from(String(right || ''))
  return a.length === b.length && timingSafeEqual(a, b)
}

function requestOrigin(req) {
  if (req.headers.origin) return req.headers.origin
  try { return req.headers.referer ? new URL(req.headers.referer).origin : null } catch { return null }
}

function expectedOrigin(req) {
  if (process.env.INTEGRATION_ALLOWED_ORIGIN) return process.env.INTEGRATION_ALLOWED_ORIGIN.replace(/\/$/, '')
  const proto = req.headers['x-forwarded-proto'] || (process.env.NODE_ENV === 'development' ? 'http' : 'https')
  const host = req.headers['x-forwarded-host'] || req.headers.host
  return host ? `${proto}://${host}` : null
}

export function integrationAccessAllowed(req) {
  if (process.env.NODE_ENV === 'development') return true
  const apiSecret = process.env.INTEGRATION_API_SECRET
  const supplied = req.headers['x-integration-api-key'] || String(req.headers.authorization || '').replace(/^Bearer\s+/i, '')
  if (apiSecret && safeEqual(apiSecret, supplied)) return true
  if (process.env.INTEGRATION_ACTIONS_ENABLED !== 'true') return false
  const origin = requestOrigin(req)
  const expected = expectedOrigin(req)
  return !!origin && !!expected && origin.replace(/\/$/, '') === expected
}

export function requireIntegrationAccess(req, res) {
  if (integrationAccessAllowed(req)) return true
  res.status(403).json({ error: 'Live integration access is disabled. Configure application authentication or explicitly enable same-origin integration actions.' })
  return false
}
