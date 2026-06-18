/* Frontend client for the real Gmail backend.

   On the static demo (GitHub Pages) there is no /api, so backendReady()
   resolves false and the app stays in its self-contained demo mode.
   On Vercel — once Gmail is connected — backendReady() is true and the
   Inbox reads & sends real mail through these functions. */

let _ready = null // null = not yet probed

export async function backendReady() {
  if (_ready !== null) return _ready
  try {
    const r = await fetch('/api/health', { cache: 'no-store' })
    if (!r.ok) {
      _ready = false
      return _ready
    }
    const j = await r.json()
    _ready = !!j.gmailConfigured
  } catch {
    _ready = false
  }
  return _ready
}

export async function fetchInbox(query) {
  const url = '/api/gmail/messages' + (query ? '?q=' + encodeURIComponent(query) : '')
  const r = await fetch(url, { cache: 'no-store' })
  const j = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(j.error || 'Could not load mail')
  return j.messages || []
}

export async function sendViaBackend({ to, subject, body, threadId }) {
  const r = await fetch('/api/gmail/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ to, subject, body, threadId }),
  })
  const j = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(j.error || 'Send failed')
  return j
}
