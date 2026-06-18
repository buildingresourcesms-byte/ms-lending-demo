import { exchangeCode } from '../_mslib.js'

/* Microsoft redirects here after consent. Exchange the code for a refresh
   token and show it once so it can be saved as OUTLOOK_REFRESH_TOKEN. */
export default async function handler(req, res) {
  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  const code = req.query.code
  if (!code) {
    const err = req.query.error_description || req.query.error || 'No authorization code returned.'
    res
      .status(400)
      .send(
        `<body style="font-family:system-ui;max-width:640px;margin:48px auto;padding:0 16px;line-height:1.5">
         <h2>Sign-in didn't complete</h2>
         <p style="white-space:pre-wrap;background:#f4f4f5;padding:12px;border-radius:8px">${String(err)}</p>
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
           <pre style="white-space:pre-wrap;background:#f4f4f5;padding:12px;border-radius:8px">${JSON.stringify(j, null, 2)}</pre>
           </body>`,
        )
      return
    }
    res.status(200).send(
      `<body style="font-family:system-ui;max-width:640px;margin:48px auto;padding:0 16px;line-height:1.5">
       <h2>&#9989; Outlook authorized</h2>
       <p>Copy this value and add it in Vercel as the <code>OUTLOOK_REFRESH_TOKEN</code>
       environment variable, then redeploy:</p>
       <textarea style="width:100%;height:120px;font-family:monospace;padding:8px" readonly>${j.refresh_token}</textarea>
       <p style="color:#71717a">Keep this secret &mdash; it lets the workspace read and send your Outlook mail.
       You can close this tab once it's saved.</p>
       </body>`,
    )
  } catch (e) {
    res
      .status(500)
      .send(
        `<body style="font-family:system-ui;max-width:640px;margin:48px auto;padding:0 16px;line-height:1.5">
         <h2>Token exchange failed</h2>
         <pre style="white-space:pre-wrap;background:#f4f4f5;padding:12px;border-radius:8px">${String(e.message || e)}</pre>
         </body>`,
      )
  }
}
