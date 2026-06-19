/* Frontend client for the real mail backend (Gmail or Outlook/Microsoft 365).

   On the static demo (GitHub Pages) there is no /api, so backendProvider()
   resolves null and the app stays in its self-contained demo mode.
   On Vercel — once a mailbox is connected — it returns 'outlook' or 'gmail'
   and the Inbox reads & sends real mail through that provider's functions. */

let _provider // undefined = not yet probed

export async function backendProvider() {
  if (_provider !== undefined) return _provider
  try {
    const r = await fetch('/api/health', { cache: 'no-store' })
    if (!r.ok) {
      _provider = null
      return _provider
    }
    const j = await r.json()
    _provider = j.provider || null
  } catch {
    _provider = null
  }
  return _provider
}

export async function backendReady() {
  return (await backendProvider()) !== null
}

function base(p) {
  return p === 'outlook' ? '/api/outlook' : '/api/gmail'
}

export async function fetchInbox(query) {
  const p = await backendProvider()
  if (!p) throw new Error('No mailbox connected')
  const url = base(p) + '/messages' + (query ? '?q=' + encodeURIComponent(query) : '')
  const r = await fetch(url, { cache: 'no-store' })
  const j = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(j.error || 'Could not load mail')
  return j.messages || []
}

/* Send mail. For an in-thread reply on Outlook pass replyToId (the original
   message id); on Gmail pass threadId. New messages need to/subject/body. */
export async function sendViaBackend({ to, subject, body, threadId, replyToId }) {
  const p = await backendProvider()
  if (!p) throw new Error('No mailbox connected')
  const r = await fetch(base(p) + '/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ to, subject, body, threadId, replyToId }),
  })
  const j = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(j.error || 'Send failed')
  return j
}

/* Calendar is Outlook/Graph-only for now (no Gmail calendar connector).
   Returns [] when the connected provider isn't Outlook so callers can
   safely merge it with demo events. */
export async function fetchCalendar({ days = 30, max = 50 } = {}) {
  const p = await backendProvider()
  if (p !== 'outlook') return []
  const r = await fetch('/api/outlook/calendar?days=' + days + '&max=' + max, { cache: 'no-store' })
  const j = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(j.error || 'Could not load calendar')
  return j.events || []
}

/* Create a real event. evt: { subject, start, end, location?, body?, attendees?, timeZone? }
   start/end are local ISO strings without offset, e.g. "2026-07-01T14:00:00". */
export async function createCalendarEvent(evt) {
  const p = await backendProvider()
  if (p !== 'outlook') throw new Error('No calendar connected')
  const r = await fetch('/api/outlook/create-event', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(evt),
  })
  const j = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(j.error || 'Could not create event')
  return j
}
