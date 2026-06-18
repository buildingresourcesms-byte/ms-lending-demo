import { env } from '../_lib.js'

/* one-time: send the user to Google's consent screen to mint a refresh token */
export default function handler(req, res) {
  const { clientId, redirectUri } = env()
  if (!clientId || !redirectUri) {
    res.status(500).send('Set GOOGLE_CLIENT_ID and GOOGLE_REDIRECT_URI in your environment first.')
    return
  }
  const url =
    'https://accounts.google.com/o/oauth2/v2/auth?' +
    new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'https://www.googleapis.com/auth/gmail.modify',
      access_type: 'offline',
      prompt: 'consent',
    })
  res.writeHead(302, { Location: url })
  res.end()
}
