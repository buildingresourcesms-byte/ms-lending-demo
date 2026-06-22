import { clearRefreshToken, browserRefreshToken } from '../_oauth.js'

export default function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'POST only' })
    return
  }
  const hadBrowserConnection = !!browserRefreshToken(req, 'outlook')
  clearRefreshToken(res, 'outlook')
  res.status(200).json({ ok: true, disconnected: hadBrowserConnection })
}
