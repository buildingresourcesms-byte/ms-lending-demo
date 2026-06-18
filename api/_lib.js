/* Shared Google/Gmail helpers for the serverless API.
   No dependencies — uses the global fetch in Vercel's Node 18+ runtime. */

export function env() {
  return {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    redirectUri: process.env.GOOGLE_REDIRECT_URI,
    refreshToken: process.env.GOOGLE_REFRESH_TOKEN,
  }
}

/* exchange the stored refresh token for a short-lived access token */
export async function getAccessToken() {
  const { clientId, clientSecret, refreshToken } = env()
  if (!clientId || !clientSecret || !refreshToken) throw new Error('Google credentials not configured')
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  })
  if (!r.ok) throw new Error('Token refresh failed: ' + (await r.text()))
  return (await r.json()).access_token
}

/* call a Gmail API path for the authorized user */
export async function gmail(path, accessToken, opts = {}) {
  const r = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/' + path, {
    ...opts,
    headers: { Authorization: 'Bearer ' + accessToken, ...(opts.headers || {}) },
  })
  if (!r.ok) throw new Error('Gmail API ' + r.status + ': ' + (await r.text()))
  return r.json()
}

export function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
}
