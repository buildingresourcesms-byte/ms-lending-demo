import { clearOAuthTokens } from '../_oauth.js'
import { connector } from '../_connector-registry.js'

export default function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })
  const provider = String(req.query.provider || req.body?.provider || '')
  const definition = connector(provider)
  if (!definition || definition.native || definition.authType !== 'oauth2') return res.status(404).json({ error: 'OAuth connector not found' })
  clearOAuthTokens(res, provider)
  res.status(200).json({ ok: true, provider })
}
