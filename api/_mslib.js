/* Shared Microsoft Graph (Outlook / Microsoft 365) helpers for the serverless API.
   Mirrors api/_lib.js (Gmail) — no dependencies, uses global fetch (Node 18+).
   Connects a single user's mailbox via the OAuth2 auth-code + refresh-token flow. */

export function env() {
  return {
    clientId: process.env.OUTLOOK_CLIENT_ID,
    clientSecret: process.env.OUTLOOK_CLIENT_SECRET,
    // Tenant segment for the OAuth URLs. REQUIRED: set to the Directory (tenant)
    // ID GUID (or the verified domain, e.g. mslending.net). A single-tenant app
    // registration is rejected by the 'organizations'/'common' authorities
    // (AADSTS50194), so there is deliberately no fallback — it must be set.
    tenant: process.env.OUTLOOK_TENANT,
    redirectUri: process.env.OUTLOOK_REDIRECT_URI,
    refreshToken: process.env.OUTLOOK_REFRESH_TOKEN,
  }
}

/* The exact scope set: offline_access => refresh token; Mail.Read => list;
   Mail.Send => send/reply; openid/profile/User.Read => basic identity.
   Must be identical on the authorize call and (if sent) the refresh call. */
export const SCOPES =
  'offline_access openid profile https://graph.microsoft.com/Mail.Read https://graph.microsoft.com/Mail.Send https://graph.microsoft.com/User.Read https://graph.microsoft.com/Calendars.ReadWrite'

export function authUrl(state) {
  const { clientId, redirectUri, tenant } = env()
  return (
    'https://login.microsoftonline.com/' +
    encodeURIComponent(tenant) +
    '/oauth2/v2.0/authorize?' +
    new URLSearchParams({
      client_id: clientId,
      response_type: 'code',
      redirect_uri: redirectUri,
      response_mode: 'query',
      scope: SCOPES,
      state,
    })
  )
}

function tokenEndpoint() {
  return 'https://login.microsoftonline.com/' + encodeURIComponent(env().tenant) + '/oauth2/v2.0/token'
}

/* one-time: trade the consent code for a refresh token */
export async function exchangeCode(code) {
  const { clientId, clientSecret, redirectUri } = env()
  const r = await fetch(tokenEndpoint(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      scope: SCOPES,
      code,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
      client_secret: clientSecret,
    }),
  })
  const j = await r.json()
  if (!r.ok) throw new Error('Token exchange failed: ' + JSON.stringify(j))
  return j
}

/* exchange the stored refresh token for a short-lived access token (hot path) */
export async function getAccessToken(req, res) {
  const { browserRefreshToken, setRefreshToken } = await import('./_oauth.js')
  const { clientId, clientSecret, refreshToken: serverRefreshToken } = env()
  const browserToken = browserRefreshToken(req, 'outlook')
  const refreshToken = browserToken || serverRefreshToken
  if (!clientId || !clientSecret || !refreshToken) throw new Error('Microsoft credentials not configured')
  const r = await fetch(tokenEndpoint(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      scope: SCOPES,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
      client_secret: clientSecret,
    }),
  })
  const j = await r.json()
  if (!r.ok) throw new Error('Token refresh failed: ' + JSON.stringify(j))
  if (j.refresh_token && browserToken) setRefreshToken(res, 'outlook', j.refresh_token)
  return j.access_token
}

/* call a Microsoft Graph v1.0 path for the authorized user.
   Tolerates the empty 202/204 bodies that sendMail and reply return. */
export async function graph(path, accessToken, opts = {}) {
  const r = await fetch('https://graph.microsoft.com/v1.0' + path, {
    ...opts,
    headers: { Authorization: 'Bearer ' + accessToken, ...(opts.headers || {}) },
  })
  if (!r.ok) throw new Error('Graph API ' + r.status + ': ' + (await r.text()))
  if (r.status === 202 || r.status === 204) return {}
  return r.json()
}
