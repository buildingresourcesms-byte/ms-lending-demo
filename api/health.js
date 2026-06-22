import { env as genv } from './_lib.js'
import { env as menv } from './_mslib.js'
import { refreshTokenSource } from './_oauth.js'

/* quick status probe the frontend uses to decide demo vs. live mode,
   and which mail provider is connected. */
export default function handler(req, res) {
  const g = genv()
  const m = menv()
  const gmailAppConfigured = !!(g.clientId && g.clientSecret && g.redirectUri)
  const outlookAppConfigured = !!(m.clientId && m.clientSecret && m.tenant && m.redirectUri)
  const gmailSource = refreshTokenSource(req, 'gmail', g.refreshToken)
  const outlookSource = refreshTokenSource(req, 'outlook', m.refreshToken)
  const gmailConfigured = gmailAppConfigured && !!gmailSource
  const outlookConfigured = outlookAppConfigured && !!outlookSource
  res.setHeader('Cache-Control', 'no-store')
  res.status(200).json({
    ok: true,
    gmailConfigured,
    outlookConfigured,
    // the live provider the frontend should use, or null for demo mode
    provider: outlookConfigured ? 'outlook' : gmailConfigured ? 'gmail' : null,
    providers: {
      outlook: {
        appConfigured: outlookAppConfigured,
        connected: outlookConfigured,
        tokenSource: outlookSource,
        missing: [
          !m.clientId && 'OUTLOOK_CLIENT_ID',
          !m.clientSecret && 'OUTLOOK_CLIENT_SECRET',
          !m.tenant && 'OUTLOOK_TENANT',
          !m.redirectUri && 'OUTLOOK_REDIRECT_URI',
        ].filter(Boolean),
        capabilities: ['mail', 'calendar'],
      },
      gmail: {
        appConfigured: gmailAppConfigured,
        connected: gmailConfigured,
        tokenSource: gmailSource,
        missing: [
          !g.clientId && 'GOOGLE_CLIENT_ID',
          !g.clientSecret && 'GOOGLE_CLIENT_SECRET',
          !g.redirectUri && 'GOOGLE_REDIRECT_URI',
        ].filter(Boolean),
        capabilities: ['mail'],
      },
    },
  })
}
