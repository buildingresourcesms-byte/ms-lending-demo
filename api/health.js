import { env } from './_lib.js'

/* quick status probe the frontend uses to decide demo vs. live mode */
export default function handler(req, res) {
  const e = env()
  res.status(200).json({
    ok: true,
    authConfigured: !!(e.clientId && e.clientSecret && e.redirectUri),
    gmailConfigured: !!(e.clientId && e.clientSecret && e.refreshToken),
  })
}
