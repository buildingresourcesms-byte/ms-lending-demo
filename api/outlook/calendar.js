import { getAccessToken, graph } from '../_mslib.js'
import { cors } from '../_lib.js'

/* Julene is in Madison, MS → Central. Times come back in this zone (the
   Prefer header), so start.dateTime is already local clock time. */
const TZ = 'Central Standard Time'

const display = (r) => r?.emailAddress?.name || r?.emailAddress?.address || ''

/* Read upcoming calendar events (now → +N days), recurrences expanded.
   Uses /me/calendarView (NOT /me/events, which returns series masters). */
export default async function handler(req, res) {
  cors(res)
  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }
  try {
    const token = await getAccessToken()
    const now = new Date()
    const days = Math.min(Math.max(Number(req.query.days) || 30, 1), 120)
    const end = new Date(now.getTime() + days * 86400000)
    // window carries an explicit offset so it isn't silently mis-shifted
    const startISO = now.toISOString().replace('Z', '+00:00')
    const endISO = end.toISOString().replace('Z', '+00:00')
    const top = Math.min(Number(req.query.max) || 100, 1000)
    const sel =
      'subject,start,end,location,isAllDay,organizer,attendees,onlineMeeting,isOnlineMeeting,webLink,bodyPreview,id,seriesMasterId,type'

    const path =
      '/me/calendarView?startDateTime=' +
      encodeURIComponent(startISO) +
      '&endDateTime=' +
      encodeURIComponent(endISO) +
      '&$select=' +
      sel +
      '&$orderby=' +
      encodeURIComponent('start/dateTime') +
      '&$top=' +
      top

    const opts = { headers: { Prefer: 'outlook.timezone="' + TZ + '"' } }
    const raw = []
    let page = await graph(path, token, opts)
    raw.push(...(page.value || []))
    // follow pagination to exhaust the window; high cap is just a runaway guard
    let guard = 0
    while (page['@odata.nextLink'] && guard++ < 20) {
      page = await graph(page['@odata.nextLink'].replace('https://graph.microsoft.com/v1.0', ''), token, opts)
      raw.push(...(page.value || []))
    }

    const events = raw.map((e) => ({
      id: e.id,
      subject: e.subject || '',
      start: { dateTime: e.start?.dateTime, timeZone: e.start?.timeZone },
      end: { dateTime: e.end?.dateTime, timeZone: e.end?.timeZone },
      allDay: !!e.isAllDay,
      location: e.location?.displayName || '',
      attendees: (e.attendees || []).map((a) => ({
        name: display(a),
        email: a.emailAddress?.address || '',
        response: a.status?.response,
      })),
      organizer: display(e.organizer),
      online: e.isOnlineMeeting ? e.onlineMeeting?.joinUrl || null : null,
      webLink: e.webLink || null,
    }))
    res.status(200).json({ events })
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) })
  }
}
