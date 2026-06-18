import { useEffect, useState, useCallback } from 'react'
import { Mail, RefreshCw, Plug, ArrowDownLeft, ArrowUpRight, Loader2, AlertTriangle } from 'lucide-react'
import { useApp } from '../store.jsx'
import { backendProvider, fetchInbox } from '../api.js'
import { PageHeader, Card, Btn, EmptyState, cx } from '../ui.jsx'

const fmt = (s) => {
  try {
    return new Date(s).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
  } catch {
    return ''
  }
}
const PROVIDER_LABEL = { outlook: 'Outlook', gmail: 'Gmail' }

export default function LiveMail() {
  const { go } = useApp()
  const [provider, setProvider] = useState(undefined) // undefined = probing, null = none
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const p = await backendProvider()
      setProvider(p)
      if (p) setItems(await fetchInbox())
    } catch (e) {
      setError(String(e.message || e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const connected = !!provider
  const label = PROVIDER_LABEL[provider] ?? 'your mailbox'

  return (
    <div>
      <PageHeader
        title="Live Mail"
        sub={
          connected
            ? `Your real ${label} inbox and sent mail, right inside the workspace.`
            : 'Your real inbox and sent mail will appear here once a mailbox is connected.'
        }
        actions={
          connected ? (
            <Btn variant="ghost" onClick={load} disabled={loading}>
              <RefreshCw className={cx('h-3.5 w-3.5', loading && 'animate-spin')} /> Refresh
            </Btn>
          ) : null
        }
      />

      {/* probing */}
      {provider === undefined && loading ? (
        <Card>
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-slate-400">
            <Loader2 className="h-4 w-4 animate-spin" /> Checking for a connected mailbox…
          </div>
        </Card>
      ) : !connected ? (
        /* not connected — the honest, useful empty state */
        <Card pad={false}>
          <EmptyState
            icon={Mail}
            title="No mailbox connected yet"
            sub="Connect Julene’s Outlook (or a Gmail) and her real inbox + sent mail show up here automatically — nothing to refresh, it just lights up."
          />
          <div className="flex flex-col items-center gap-2 px-6 pb-8 sm:flex-row sm:justify-center">
            <Btn onClick={() => go('integrations')}>
              <Plug className="h-3.5 w-3.5" /> Connect a mailbox
            </Btn>
            <Btn variant="ghost" onClick={load}>
              <RefreshCw className="h-3.5 w-3.5" /> Check again
            </Btn>
          </div>
        </Card>
      ) : error ? (
        <Card>
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <AlertTriangle className="h-6 w-6 text-amber-500" />
            <p className="text-[13px] font-medium text-slate-600 dark:text-slate-300">Couldn’t load your mail</p>
            <p className="max-w-md text-xs text-slate-400">{error}</p>
            <Btn variant="ghost" onClick={load}>
              <RefreshCw className="h-3.5 w-3.5" /> Try again
            </Btn>
          </div>
        </Card>
      ) : items.length === 0 ? (
        <Card pad={false}>
          <EmptyState icon={Mail} title="No recent mail" sub={`Connected to ${label}, but nothing came back. Try Refresh.`} />
        </Card>
      ) : (
        <Card pad={false} className="overflow-hidden">
          <ul className="divide-y divide-slate-100 dark:divide-white/[0.06]">
            {items.map((m) => {
              const Icon = m.sent ? ArrowUpRight : ArrowDownLeft
              return (
                <li
                  key={m.id}
                  className={cx(
                    'flex items-start gap-3 px-4 py-3 transition-colors hover:bg-slate-50/70 dark:hover:bg-white/5',
                    m.unread && 'bg-navy-50/40 dark:bg-white/[0.04]',
                  )}
                >
                  <span
                    className={cx(
                      'mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full',
                      m.sent ? 'bg-slate-100 text-slate-500 dark:bg-white/10' : 'bg-sage-50 text-sage-600 dark:bg-sage-500/15',
                    )}
                    title={m.sent ? 'Sent' : 'Received'}
                  >
                    <Icon className="h-3.5 w-3.5" strokeWidth={2} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className={cx('truncate text-[13px] dark:text-white', m.unread ? 'font-bold text-navy-950' : 'font-semibold text-navy-950')}>
                        {m.sent ? `To: ${m.to || '—'}` : m.from || '—'}
                      </p>
                      <span className="shrink-0 text-[11px] text-slate-400">{fmt(m.date)}</span>
                    </div>
                    <p className={cx('mt-0.5 truncate text-xs', m.unread ? 'font-semibold text-slate-700 dark:text-slate-200' : 'text-slate-600 dark:text-slate-300')}>
                      {m.subject || '(no subject)'}
                      {m.unread && <span className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full bg-rose-500 align-middle" />}
                    </p>
                    {m.snippet && <p className="mt-0.5 truncate text-xs text-slate-400">{m.snippet}</p>}
                  </div>
                </li>
              )
            })}
          </ul>
        </Card>
      )}
    </div>
  )
}
