import { createHash, randomBytes } from 'node:crypto'
import { beginOAuth, browserOAuthTokens, setOAuthTokens, setPkceVerifier } from './_oauth.js'
import { connector } from './_connector-registry.js'

const prefix = (provider) => `CONNECTOR_${String(provider).toUpperCase().replace(/[^A-Z0-9]/g, '_')}`

function redirectUri(definition) {
  return process.env[definition.redirectEnv]
}

function credentials(definition) {
  return {
    clientId: process.env[definition.clientIdEnv],
    clientSecret: process.env[definition.clientSecretEnv],
  }
}

function basic(clientId, clientSecret) {
  return Buffer.from(`${clientId}:${clientSecret}`, 'utf8').toString('base64')
}

function tokenRequest(definition, params) {
  const { clientId, clientSecret } = credentials(definition)
  const headers = { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' }
  const body = new URLSearchParams(params)
  if (definition.tokenAuth === 'basic') headers.Authorization = `Basic ${basic(clientId, clientSecret)}`
  else {
    body.set(definition.clientParam || 'client_id', clientId) // TikTok uses client_key
    body.set('client_secret', clientSecret)
  }
  return { headers, body }
}

export function connectorAuthorizationUrl(res, provider) {
  const definition = connector(provider)
  if (!definition || definition.authType !== 'oauth2' || definition.native) throw new Error('OAuth connector not found')
  const { clientId } = credentials(definition)
  const state = beginOAuth(res, provider)
  const params = new URLSearchParams({
    redirect_uri: redirectUri(definition),
    response_type: 'code',
    state,
    ...(definition.authorizeParams || {}),
  })
  params.set(definition.clientParam || 'client_id', clientId) // TikTok uses client_key
  if (definition.scope) params.set('scope', definition.scope)
  if (definition.pkce) {
    // PKCE S256 (Canva, TikTok): keep the verifier server-side, send only the challenge
    const verifier = randomBytes(32).toString('base64url')
    setPkceVerifier(res, provider, verifier)
    params.set('code_challenge', createHash('sha256').update(verifier).digest('base64url'))
    params.set('code_challenge_method', 'S256')
  }
  return `${definition.authorizeUrl}?${params}`
}

export async function exchangeConnectorCode(provider, code, callbackQuery = {}, codeVerifier = null) {
  const definition = connector(provider)
  if (!definition || definition.authType !== 'oauth2' || definition.native) throw new Error('OAuth connector not found')
  const tokenParams = {
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri(definition),
  }
  if (definition.pkce && codeVerifier) tokenParams.code_verifier = codeVerifier
  const request = tokenRequest(definition, tokenParams)
  const response = await fetch(definition.tokenUrl, { method: 'POST', ...request })
  const text = await response.text()
  let tokens
  try { tokens = text ? JSON.parse(text) : {} } catch { tokens = { error: text } }
  if (!response.ok || !tokens.access_token) throw new Error(tokens.error_description || tokens.error || `Token exchange failed (${response.status})`)
  return {
    ...tokens,
    realmId: callbackQuery.realmId || tokens.realmId,
    obtained_at: Date.now(),
    expires_at: tokens.expires_in ? Date.now() + Number(tokens.expires_in) * 1000 : null,
  }
}

function environmentTokens(provider) {
  const key = prefix(provider)
  const accessToken = process.env[`${key}_ACCESS_TOKEN`]
  const refreshToken = process.env[`${key}_REFRESH_TOKEN`]
  if (!accessToken && !refreshToken) return null
  return { access_token: accessToken, refresh_token: refreshToken, realmId: process.env[`${key}_REALM_ID`] }
}

export function connectorTokenState(req, provider) {
  if (browserOAuthTokens(req, provider)) return { connected: true, tokenSource: 'browser' }
  if (environmentTokens(provider)) return { connected: true, tokenSource: 'server' }
  return { connected: false, tokenSource: null }
}

export async function connectorAccessToken(req, res, provider) {
  const definition = connector(provider)
  if (!definition || definition.authType !== 'oauth2' || definition.native) throw new Error('OAuth connector not found')
  const browserTokens = browserOAuthTokens(req, provider)
  const tokens = browserTokens || environmentTokens(provider)
  if (!tokens) throw new Error(`${definition.name} is not connected`)
  if (tokens.access_token && (!tokens.expires_at || Number(tokens.expires_at) > Date.now() + 60_000)) return tokens
  if (!tokens.refresh_token) throw new Error(`${definition.name} access expired; reconnect it`)

  const request = tokenRequest(definition, {
    grant_type: 'refresh_token',
    refresh_token: tokens.refresh_token,
  })
  const response = await fetch(definition.tokenUrl, { method: 'POST', ...request })
  const text = await response.text()
  let refreshed
  try { refreshed = text ? JSON.parse(text) : {} } catch { refreshed = { error: text } }
  if (!response.ok || !refreshed.access_token) throw new Error(refreshed.error_description || refreshed.error || `Token refresh failed (${response.status})`)
  const next = {
    ...tokens,
    ...refreshed,
    refresh_token: refreshed.refresh_token || tokens.refresh_token,
    obtained_at: Date.now(),
    expires_at: refreshed.expires_in ? Date.now() + Number(refreshed.expires_in) * 1000 : null,
  }
  if (browserTokens) setOAuthTokens(res, provider, next)
  else if (refreshed.refresh_token && refreshed.refresh_token !== tokens.refresh_token) {
    // server/env-token mode can't persist a rotated refresh token, so providers
    // that rotate on every refresh (QuickBooks, Dropbox, DocuSign) would die
    // after the old token is invalidated. Warn loudly; prefer the in-app connect.
    console.warn(`[${provider}] refresh token rotated but cannot be persisted in CONNECTOR_*_REFRESH_TOKEN mode — connect via the app to avoid expiry.`)
  }
  return next
}

export function saveConnectorTokens(res, provider, tokens) {
  setOAuthTokens(res, provider, tokens)
}
