import { clearOAuthState, clearPkceVerifier, escapeHtml, getPkceVerifier, validOAuthState } from '../_oauth.js'
import { exchangeConnectorCode, saveConnectorTokens } from '../_connector-oauth.js'
import { connector } from '../_connector-registry.js'

export default async function handler(req, res) {
  const provider = String(req.query.provider || '')
  const definition = connector(provider)
  if (!definition || definition.native || definition.authType !== 'oauth2') return res.status(404).send('OAuth connector not found.')
  if (!validOAuthState(req, provider, req.query.state)) return res.status(400).send('<h2>Connection expired</h2><p>Return to MS Lending and start again.</p>')
  const codeVerifier = getPkceVerifier(req, provider)
  clearOAuthState(res, provider)
  clearPkceVerifier(res, provider)
  if (req.query.error || !req.query.code) {
    const message = escapeHtml(req.query.error_description || req.query.error || 'No authorization code returned.')
    return res.status(400).send(`<h2>${escapeHtml(definition.name)} sign-in did not complete</h2><p>${message}</p>`)
  }
  try {
    const tokens = await exchangeConnectorCode(provider, req.query.code, req.query, codeVerifier)
    saveConnectorTokens(res, provider, tokens)
    res.writeHead(302, { Location: `/?integration=${encodeURIComponent(provider)}&connected=1` })
    res.end()
  } catch (error) {
    res.status(502).send(`<h2>Connection failed</h2><p>${escapeHtml(error.message || error)}</p>`)
  }
}
