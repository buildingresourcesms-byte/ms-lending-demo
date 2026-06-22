import { runConnectorAction } from '../_connector-actions.js'
import { appConfigured, connector, missingEnvironment } from '../_connector-registry.js'
import { requireIntegrationAccess } from '../_integration-access.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })
  if (!requireIntegrationAccess(req, res)) return
  const provider = String(req.body?.provider || req.query.provider || '')
  const action = String(req.body?.action || '')
  const definition = connector(provider)
  if (!definition) return res.status(404).json({ error: 'Connector not found' })
  if (!appConfigured(definition)) return res.status(503).json({ error: 'Connector credentials are missing', missing: missingEnvironment(definition) })
  try {
    const data = await runConnectorAction(req, res, provider, action, req.body?.payload || {})
    res.status(200).json({ ok: true, provider, action, data })
  } catch (error) {
    res.status(502).json({ error: error.message || String(error), provider, action })
  }
}
