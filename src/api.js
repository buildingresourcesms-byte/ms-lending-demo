/* Frontend client for the real mail backend (Gmail or Outlook/Microsoft 365).

   On the static demo (GitHub Pages) there is no /api, so backendProvider()
   resolves null and the app stays in its self-contained demo mode.
   On Vercel — once a mailbox is connected — it returns 'outlook' or 'gmail'
   and the Inbox reads & sends real mail through that provider's functions. */

let _status // undefined = not yet probed
let _integrationStatus

const EMPTY_STATUS = {
  available: false,
  provider: null,
  providers: {
    outlook: { appConfigured: false, connected: false, tokenSource: null, missing: [], capabilities: ['mail', 'calendar'] },
    gmail: { appConfigured: false, connected: false, tokenSource: null, missing: [], capabilities: ['mail'] },
  },
}

export async function backendStatus({ refresh = false } = {}) {
  if (!refresh && _status !== undefined) return _status
  try {
    const r = await fetch('/api/health', { cache: 'no-store' })
    if (!r.ok) throw new Error('Backend status unavailable')
    const j = await r.json()
    _status = { ...EMPTY_STATUS, ...j, available: true, providers: { ...EMPTY_STATUS.providers, ...(j.providers || {}) } }
  } catch {
    _status = EMPTY_STATUS
  }
  return _status
}

export async function backendProvider(refresh = false) {
  return (await backendStatus({ refresh })).provider || null
}

export async function backendReady() {
  return (await backendProvider()) !== null
}

function base(p) {
  return p === 'outlook' ? '/api/outlook' : '/api/gmail'
}

function friendlyError(message, fallback) {
  const text = String(message || '')
  if (/invalid_grant|token refresh|expired|revoked/i.test(text)) {
    return 'Your mailbox connection expired. Reconnect it from Integrations, then try again.'
  }
  if (/insufficient|forbidden|403|permission/i.test(text)) {
    return 'This mailbox needs permission for that action. Reconnect it and approve the requested access.'
  }
  if (/credentials not configured|no mailbox|no calendar/i.test(text)) {
    return 'No live account is connected. Open Integrations to finish setup.'
  }
  return fallback
}

export async function disconnectBackend(provider) {
  const r = await fetch(`/api/${provider}/disconnect`, { method: 'POST' })
  const j = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(j.error || 'Could not disconnect this account')
  _status = undefined
  return j
}

export async function integrationBackendStatus({ refresh = false } = {}) {
  if (!refresh && _integrationStatus) return _integrationStatus
  try {
    const response = await fetch('/api/integrations/status', { cache: 'no-store' })
    if (!response.ok) throw new Error('Integration backend status unavailable')
    _integrationStatus = { available: true, ...(await response.json()) }
  } catch {
    _integrationStatus = { available: false, runtime: 'static', connectors: {} }
  }
  return _integrationStatus
}

export async function disconnectIntegrationBackend(provider) {
  const definition = (await integrationBackendStatus()).connectors?.[provider]
  const url = definition?.connectUrl?.startsWith(`/api/${provider}/`)
    ? `/api/${provider}/disconnect`
    : `/api/integrations/disconnect?provider=${encodeURIComponent(provider)}`
  const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ provider }) })
  const body = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(body.error || 'Could not disconnect integration')
  _integrationStatus = undefined
  _status = undefined
  return body
}

export async function runIntegrationAction(provider, action, payload = {}) {
  const response = await fetch('/api/integrations/action', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ provider, action, payload }),
  })
  const body = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(body.error || `${provider} action failed`)
  return body.data
}

export async function fetchInbox(query) {
  const p = await backendProvider()
  if (!p) throw new Error('No mailbox connected')
  const url = base(p) + '/messages' + (query ? '?q=' + encodeURIComponent(query) : '')
  const r = await fetch(url, { cache: 'no-store' })
  const j = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(friendlyError(j.error, 'We could not load mail right now. Try again in a moment.'))
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
  if (!r.ok) throw new Error(friendlyError(j.error, 'Your message was not sent. Check the connection and try again.'))
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
  if (!r.ok) throw new Error(friendlyError(j.error, 'We could not load the connected calendar right now.'))
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
  if (!r.ok) throw new Error(friendlyError(j.error, 'The calendar event was not created. Check the connection and try again.'))
  return j
}
