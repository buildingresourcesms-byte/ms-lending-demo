import { connectorAuthorizationUrl } from '../_connector-oauth.js'
import { appConfigured, connector, missingEnvironment } from '../_connector-registry.js'

export default function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' })
  const provider = String(req.query.provider || '')
  const definition = connector(provider)
  if (!definition || definition.native || definition.authType !== 'oauth2') return res.status(404).json({ error: 'OAuth connector not found' })
  if (!appConfigured(definition)) return res.status(503).json({ error: 'Connector credentials are missing', missing: missingEnvironment(definition) })
  res.writeHead(302, { Location: connectorAuthorizationUrl(res, provider) })
  res.end()
}
