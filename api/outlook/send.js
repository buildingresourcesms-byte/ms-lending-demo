import { getAccessToken, graph } from '../_mslib.js'
import { cors } from '../_lib.js'
import { requireIntegrationAccess } from '../_integration-access.js'

/* Send real mail through the authorized Outlook / Microsoft 365 account.
   Body: { to, subject, body, replyToId? }
   - replyToId  = the original message id  -> in-thread reply (RE:, quoted, same
                  conversation). Graph threads replies by message id, not by
                  conversationId, so the UI must pass the original message's id.
   - no replyToId -> brand-new message via sendMail. */
export default async function handler(req, res) {
  if (!requireIntegrationAccess(req, res)) return
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
    const { to, subject, body, replyToId } = req.body || {}
    if (!body) {
      res.status(400).json({ error: 'body is required' })
      return
    }
    const token = await getAccessToken(req, res)

    if (replyToId) {
      // in-thread reply: pass only `comment` (never also message.body -> 400)
      await graph('/me/messages/' + encodeURIComponent(replyToId) + '/reply', token, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comment: body }),
      })
      res.status(200).json({ ok: true, threaded: true })
      return
    }

    if (!to) {
      res.status(400).json({ error: 'to is required for a new message' })
      return
    }
    const toRecipients = String(to)
      .split(',')
      .map((a) => a.trim())
      .filter(Boolean)
      .map((address) => ({ emailAddress: { address } }))

    await graph('/me/sendMail', token, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: {
          subject: subject || '',
          body: { contentType: 'Text', content: body },
          toRecipients,
        },
        saveToSentItems: true,
      }),
    })
    res.status(200).json({ ok: true })
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) })
  }
}
