import { getAccessToken, gmail, cors } from '../_lib.js'

function header(headers, name) {
  const h = (headers || []).find((x) => x.name.toLowerCase() === name.toLowerCase())
  return h ? h.value : ''
}

/* List recent mail (inbox + sent), normalized for the workspace UI.
   Optional ?q= Gmail search, e.g. ?q=from:someone@x.com */
export default async function handler(req, res) {
  cors(res)
  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }
  try {
    const token = await getAccessToken()
    const q = req.query.q || 'in:inbox OR in:sent'
    const max = Math.min(Number(req.query.max) || 20, 40)
    const list = await gmail('messages?maxResults=' + max + '&q=' + encodeURIComponent(q), token)
    const ids = (list.messages || []).map((m) => m.id)
    const messages = await Promise.all(
      ids.map(async (id) => {
        const m = await gmail(
          'messages/' +
            id +
            '?format=metadata&metadataHeaders=From&metadataHeaders=To&metadataHeaders=Subject&metadataHeaders=Date',
          token,
        )
        const h = m.payload?.headers || []
        return {
          id: m.id,
          threadId: m.threadId,
          from: header(h, 'From'),
          to: header(h, 'To'),
          subject: header(h, 'Subject'),
          date: header(h, 'Date'),
          snippet: m.snippet || '',
          unread: (m.labelIds || []).includes('UNREAD'),
          sent: (m.labelIds || []).includes('SENT'),
        }
      }),
    )
    res.status(200).json({ messages })
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) })
  }
}
