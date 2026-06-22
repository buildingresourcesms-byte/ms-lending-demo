import { env } from '../_lib.js'
import { clearOAuthState, escapeHtml, setRefreshToken, validOAuthState } from '../_oauth.js'

/* Google redirects here after consent. Exchange the code, store the refresh
   token in an HTTP-only cookie, and return to the Integrations page. */
export default async function handler(req, res) {
  const { clientId, clientSecret, redirectUri } = env()
  const code = req.query.code
  if (!validOAuthState(req, 'gmail', req.query.state)) {
    res.status(400).send('<h2>Connection expired</h2><p>Please return to MS Lending and start the connection again.</p>')
    return
  }
  clearOAuthState(res, 'gmail')
  if (!code) {
    res.status(400).send('No authorization code returned.')
    return
  }
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  })
  const j = await r.json()
  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  if (!j.refresh_token) {
    res
      .status(500)
      .send(
        `<body style="font-family:system-ui;max-width:640px;margin:48px auto;padding:0 16px">
         <h2>No refresh token returned</h2>
         <p>Google only sends a refresh token on first consent. Remove this app's access at
         <a href="https://myaccount.google.com/permissions">myaccount.google.com/permissions</a> and try again.</p>
         <pre style="white-space:pre-wrap;background:#f4f4f5;padding:12px;border-radius:8px">${escapeHtml(j.error_description || j.error || 'OAuth consent did not return offline access.')}</pre>
         </body>`,
      )
    return
  }
  setRefreshToken(res, 'gmail', j.refresh_token)
  res.writeHead(302, { Location: '/?integration=gmail&connected=1' })
  res.end()
}
