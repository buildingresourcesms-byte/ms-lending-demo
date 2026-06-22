import { exchangeCode } from '../_mslib.js'
import { clearOAuthState, escapeHtml, setRefreshToken, validOAuthState } from '../_oauth.js'

/* Microsoft redirects here after consent. Exchange the code, store the refresh
   token in an HTTP-only cookie, and return to the Integrations page. */
export default async function handler(req, res) {
  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  const code = req.query.code
  if (!validOAuthState(req, 'outlook', req.query.state)) {
    res.status(400).send('<h2>Connection expired</h2><p>Please return to MS Lending and start the connection again.</p>')
    return
  }
  clearOAuthState(res, 'outlook')
  if (!code) {
    const err = req.query.error_description || req.query.error || 'No authorization code returned.'
    res
      .status(400)
      .send(
        `<body style="font-family:system-ui;max-width:640px;margin:48px auto;padding:0 16px;line-height:1.5">
         <h2>Sign-in didn't complete</h2>
         <p style="white-space:pre-wrap;background:#f4f4f5;padding:12px;border-radius:8px">${escapeHtml(err)}</p>
         <p style="color:#71717a">If this says approval is required, the Microsoft 365 admin (account owner)
         needs to grant consent once. See BACKEND-SETUP.md.</p>
         </body>`,
      )
    return
  }
  try {
    const j = await exchangeCode(code)
    if (!j.refresh_token) {
      res
        .status(500)
        .send(
          `<body style="font-family:system-ui;max-width:640px;margin:48px auto;padding:0 16px">
           <h2>No refresh token returned</h2>
           <p>The scope must include <code>offline_access</code>. Try again, or remove this app's access at
           <a href="https://myaccount.microsoft.com/">myaccount.microsoft.com</a> and re-consent.</p>
           <pre style="white-space:pre-wrap;background:#f4f4f5;padding:12px;border-radius:8px">${escapeHtml(j.error_description || j.error || 'OAuth consent did not return offline access.')}</pre>
           </body>`,
        )
      return
    }
    setRefreshToken(res, 'outlook', j.refresh_token)
    res.writeHead(302, { Location: '/?integration=outlook&connected=1' })
    res.end()
  } catch (e) {
    res
      .status(500)
      .send(
        `<body style="font-family:system-ui;max-width:640px;margin:48px auto;padding:0 16px;line-height:1.5">
         <h2>Token exchange failed</h2>
         <pre style="white-space:pre-wrap;background:#f4f4f5;padding:12px;border-radius:8px">${escapeHtml(e.message || e)}</pre>
         </body>`,
      )
  }
}
