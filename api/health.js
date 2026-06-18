import { env as genv } from './_lib.js'
import { env as menv } from './_mslib.js'

/* quick status probe the frontend uses to decide demo vs. live mode,
   and which mail provider is connected. */
export default function handler(req, res) {
  const g = genv()
  const m = menv()
  const gmailConfigured = !!(g.clientId && g.clientSecret && g.refreshToken)
  const outlookConfigured = !!(m.clientId && m.clientSecret && m.refreshToken)
  res.status(200).json({
    ok: true,
    gmailConfigured,
    outlookConfigured,
    // the live provider the frontend should use, or null for demo mode
    provider: outlookConfigured ? 'outlook' : gmailConfigured ? 'gmail' : null,
  })
}
