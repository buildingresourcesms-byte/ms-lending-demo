import { env } from '../_lib.js'
import { beginOAuth } from '../_oauth.js'

/* one-time: send the user to Google's consent screen to mint a refresh token */
export default function handler(req, res) {
  const { clientId, clientSecret, redirectUri } = env()
  if (!clientId || !clientSecret || !redirectUri) {
    res.status(500).send('Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REDIRECT_URI first.')
    return
  }
  const state = beginOAuth(res, 'gmail')
  const url =
    'https://accounts.google.com/o/oauth2/v2/auth?' +
    new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'https://www.googleapis.com/auth/gmail.modify',
      access_type: 'offline',
      prompt: 'consent',
      state,
    })
  res.writeHead(302, { Location: url })
  res.end()
}
