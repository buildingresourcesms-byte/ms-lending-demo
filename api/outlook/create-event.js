import { getAccessToken, graph } from '../_mslib.js'
import { cors } from '../_lib.js'

const TZ = 'Central Standard Time'

/* Create a real calendar event.
   Body: { subject, start, end, location?, body?, attendees?, timeZone? }
   - start/end: LOCAL ISO strings WITHOUT offset, e.g. "2026-07-01T14:00:00"
     (the timeZone field names the zone — default Central).
   - attendees: [{ email, name? }] — NOTE: passing attendees emails real
     invitations, so the caller must opt in deliberately. */
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
    const { subject, start, end, location, body, attendees, timeZone } = req.body || {}
    if (!subject || !start || !end) {
      res.status(400).json({ error: 'subject, start, end are required' })
      return
    }
    const tz = timeZone || TZ
    const token = await getAccessToken()

    const payload = {
      subject,
      start: { dateTime: start, timeZone: tz },
      end: { dateTime: end, timeZone: tz },
      // idempotency: a retried POST with the same id won't duplicate the event
      transactionId: globalThis.crypto?.randomUUID?.(),
    }
    if (location) payload.location = { displayName: location }
    if (body) payload.body = { contentType: 'HTML', content: body }
    if (Array.isArray(attendees) && attendees.length) {
      payload.attendees = attendees
        .filter((a) => a && a.email)
        .map((a) => ({ emailAddress: { address: a.email, name: a.name || a.email }, type: 'required' }))
    }

    const created = await graph('/me/events', token, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Prefer: 'outlook.timezone="' + tz + '"' },
      body: JSON.stringify(payload),
    })
    res.status(201).json({ ok: true, id: created.id, webLink: created.webLink })
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) })
  }
}
