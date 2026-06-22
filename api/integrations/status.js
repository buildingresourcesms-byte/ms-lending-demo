import { env as gmailEnv } from '../_lib.js'
import { env as outlookEnv } from '../_mslib.js'
import { connectorIds, connector, publicConnector, appConfigured } from '../_connector-registry.js'
import { connectorTokenState } from '../_connector-oauth.js'
import { refreshTokenSource } from '../_oauth.js'

export default function handler(req, res) {
  const gmail = gmailEnv()
  const outlook = outlookEnv()
  const origin = `${req.headers['x-forwarded-proto'] || (process.env.NODE_ENV === 'development' ? 'http' : 'https')}://${req.headers['x-forwarded-host'] || req.headers.host || process.env.VERCEL_URL || 'localhost:4173'}`
  const connectors = Object.fromEntries(
    connectorIds().map((id) => {
      const definition = connector(id)
      let state = { connected: false, tokenSource: null }
      if (id === 'gmail') {
        const source = refreshTokenSource(req, id, gmail.refreshToken)
        state = { connected: appConfigured(definition) && !!source, tokenSource: source }
      } else if (id === 'outlook') {
        const source = refreshTokenSource(req, id, outlook.refreshToken)
        state = { connected: appConfigured(definition) && !!source, tokenSource: source }
      } else if (definition.authType === 'oauth2') state = connectorTokenState(req, id)
      else if (appConfigured(definition)) state = { connected: true, tokenSource: 'server' }
      const value = publicConnector(definition, state)
      if (definition.authType === 'oauth2') {
        value.suggestedCallbackUrl = definition.native
          ? `${origin}/api/${id}/callback`
          : `${origin}/api/integrations/callback?provider=${id}`
      }
      if (definition.webhook) value.suggestedWebhookUrl = `${origin}/api/integrations/webhook?provider=${id}`
      return [id, value]
    }),
  )
  res.setHeader('Cache-Control', 'no-store')
  res.status(200).json({ ok: true, runtime: process.env.VERCEL ? 'vercel' : process.env.NODE_ENV === 'development' ? 'local' : 'node', connectors })
}
