import { env, authUrl } from '../_mslib.js'

/* one-time: send the user to Microsoft's consent screen to mint a refresh token */
export default function handler(req, res) {
  const { clientId, redirectUri, tenant } = env()
  const missing = [
    !clientId && 'OUTLOOK_CLIENT_ID',
    !redirectUri && 'OUTLOOK_REDIRECT_URI',
    !tenant && 'OUTLOOK_TENANT (your Directory/tenant ID — required for a single-tenant app)',
  ].filter(Boolean)
  if (missing.length) {
    res.status(500).send('Set these environment variables first, then redeploy:\n- ' + missing.join('\n- '))
    return
  }
  res.writeHead(302, { Location: authUrl() })
  res.end()
}
