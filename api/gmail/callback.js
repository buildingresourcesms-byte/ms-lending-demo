import { env } from '../_lib.js'

/* Google redirects here after consent. We exchange the code for a refresh
   token and show it once so it can be saved as GOOGLE_REFRESH_TOKEN. */
export default async function handler(req, res) {
  const { clientId, clientSecret, redirectUri } = env()
  const code = req.query.code
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
         <pre style="white-space:pre-wrap;background:#f4f4f5;padding:12px;border-radius:8px">${JSON.stringify(j, null, 2)}</pre>
         </body>`,
      )
    return
  }
  res.status(200).send(
    `<body style="font-family:system-ui;max-width:640px;margin:48px auto;padding:0 16px;line-height:1.5">
     <h2>&#9989; Gmail authorized</h2>
     <p>Copy this value and add it in Vercel as the <code>GOOGLE_REFRESH_TOKEN</code>
     environment variable, then redeploy:</p>
     <textarea style="width:100%;height:90px;font-family:monospace;padding:8px" readonly>${j.refresh_token}</textarea>
     <p style="color:#71717a">Keep this secret &mdash; it lets the workspace read and send your Gmail.
     You can close this tab once it's saved.</p>
     </body>`,
  )
}
