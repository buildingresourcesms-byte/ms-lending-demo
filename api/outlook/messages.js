import { getAccessToken, graph } from '../_mslib.js'
import { cors } from '../_lib.js'
import { requireIntegrationAccess } from '../_integration-access.js'

const display = (r) => r?.emailAddress?.name || r?.emailAddress?.address || ''

/* List recent mail (inbox + sent), normalized to match the Gmail connector's
   shape so the frontend stays connector-agnostic. Graph has no cross-folder
   query, so we read both folders and merge. */
export default async function handler(req, res) {
  if (!requireIntegrationAccess(req, res)) return
  cors(res)
  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }
  try {
    const token = await getAccessToken(req, res)
    const top = Math.min(Number(req.query.max) || 20, 40)
    const sel = 'id,subject,from,toRecipients,bodyPreview,conversationId'
    const [inbox, sent] = await Promise.all([
      graph(
        '/me/mailFolders/inbox/messages?$select=' +
          sel +
          ',receivedDateTime,isRead&$top=' +
          top +
          '&$orderby=' +
          encodeURIComponent('receivedDateTime desc'),
        token,
      ),
      graph(
        '/me/mailFolders/sentitems/messages?$select=' +
          sel +
          ',sentDateTime&$top=' +
          top +
          '&$orderby=' +
          encodeURIComponent('sentDateTime desc'),
        token,
      ),
    ])
    const norm = (m, isSent) => ({
      id: m.id,
      threadId: m.conversationId,
      from: display(m.from),
      to: (m.toRecipients || []).map(display).join(', '),
      subject: m.subject || '',
      date: m.receivedDateTime || m.sentDateTime || '',
      snippet: m.bodyPreview || '',
      unread: m.isRead === false,
      sent: isSent,
    })
    const messages = [
      ...(inbox.value || []).map((m) => norm(m, false)),
      ...(sent.value || []).map((m) => norm(m, true)),
    ].sort((a, b) => (a.date < b.date ? 1 : -1))
    res.status(200).json({ messages })
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) })
  }
}
