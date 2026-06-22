import { env, authUrl } from '../_mslib.js'
import { beginOAuth } from '../_oauth.js'

/* one-time: send the user to Microsoft's consent screen to mint a refresh token */
export default function handler(req, res) {
  const { clientId, clientSecret, redirectUri, tenant } = env()
  const missing = [
    !clientId && 'OUTLOOK_CLIENT_ID',
    !clientSecret && 'OUTLOOK_CLIENT_SECRET',
    !redirectUri && 'OUTLOOK_REDIRECT_URI',
    !tenant && 'OUTLOOK_TENANT (your Directory/tenant ID — required for a single-tenant app)',
  ].filter(Boolean)
  if (missing.length) {
    res.status(500).send('Set these environment variables first, then redeploy:\n- ' + missing.join('\n- '))
    return
  }
  const state = beginOAuth(res, 'outlook')
  res.writeHead(302, { Location: authUrl(state) })
  res.end()
}
