import { getAccessToken, gmail, cors } from '../_lib.js'

function b64url(s) {
  return Buffer.from(s, 'utf-8').toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/* Send a real email through the authorized Gmail account.
   Body: { to, subject, body, threadId? } — threadId keeps replies in-thread. */
export default async function handler(req, res) {
  cors(res)
  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'POST only' })
    return
  }
  try {
    const { to, subject, body, threadId } = req.body || {}
    if (!to || !body) {
      res.status(400).json({ error: 'to and body are required' })
      return
    }
    const token = await getAccessToken()
    const mime =
      `To: ${to}\r\n` +
      `Subject: ${subject || ''}\r\n` +
      'MIME-Version: 1.0\r\n' +
      'Content-Type: text/plain; charset="UTF-8"\r\n\r\n' +
      body
    const payload = { raw: b64url(mime) }
    if (threadId) payload.threadId = threadId
    const sent = await gmail('messages/send', token, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    res.status(200).json({ ok: true, id: sent.id, threadId: sent.threadId })
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) })
  }
}
