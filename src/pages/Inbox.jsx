import { useMemo, useState } from 'react'
import { Inbox as InboxIcon, Phone, MessageSquare, Mail, Plug, ChevronLeft } from 'lucide-react'
import { useApp } from '../store.jsx'
import { officerById, relDate, fmtDateFull } from '../data.js'
import { PageHeader, Card, Avatar, EmptyState, cx } from '../ui.jsx'
import { EVENT_META } from '../events.jsx'
import { CHANNELS, channelProvider, ComposeModal } from './LoanFile.jsx'

/* timeline event types that count as borrower communication */
const COMM_TYPES = ['email', 'sms', 'call', 'apply']

const CHANNEL_LABEL = { email: 'Email', sms: 'Text', call: 'Call', apply: 'Apply link' }

/* compact reach-out row reused inside a conversation */
function ReplyBar({ b, connections, onPick }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {Object.entries(CHANNELS).map(([key, c]) => {
        const prov = channelProvider(key, connections)
        const Icon = c.icon
        return (
          <button
            key={key}
            onClick={() => onPick(key)}
            className={cx(
              'inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-medium transition-all duration-150 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-500/40',
              prov
                ? 'border-slate-300/80 bg-white text-slate-700 hover:border-slate-400/80 hover:text-navy-900'
                : 'border-dashed border-slate-300 bg-slate-50/40 text-slate-400 hover:text-slate-600',
            )}
          >
            <Icon className="h-3.5 w-3.5" strokeWidth={1.75} />
            {c.label}
            {prov ? <span className="h-1.5 w-1.5 rounded-full bg-sage-500" /> : <Plug className="h-3 w-3 opacity-60" />}
          </button>
        )
      })}
    </div>
  )
}

export default function Inbox() {
  const { borrowers, connections, openLoan, seat, currentOfficer } = useApp()
  const [selectedId, setSelectedId] = useState(null)
  const [compose, setCompose] = useState(null)
  const [mobileThread, setMobileThread] = useState(false) // mobile: show thread instead of list

  const scoped = seat === 'team' ? borrowers : borrowers.filter((b) => b.officerId === seat)

  const conversations = useMemo(() => {
    return scoped
      .map((b) => {
        const comms = b.timeline.filter((e) => COMM_TYPES.includes(e.type))
        if (comms.length === 0) return null
        return { b, comms, last: comms[comms.length - 1] }
      })
      .filter(Boolean)
      .sort((a, z) => (a.last.date < z.last.date ? 1 : -1))
  }, [scoped])

  const active =
    conversations.find((c) => c.b.id === selectedId) ?? conversations[0] ?? null

  return (
    <div>
      <PageHeader
        title="Inbox"
        sub={
          currentOfficer
            ? `${currentOfficer.name.split(' ')[0]}’s borrower conversations — email, text, calls, and apply-link activity.`
            : 'Every borrower conversation — email, text, calls, and apply-link activity in one place.'
        }
      />

      {conversations.length === 0 ? (
        <div className="rounded-xl border border-slate-200/80 bg-white">
          <EmptyState
            icon={InboxIcon}
            title="No conversations yet"
            sub="Email or text a borrower from their loan file and it shows up here."
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[20rem_1fr]">
          {/* ---- conversation list ---- */}
          <Card pad={false} className={cx('overflow-hidden', mobileThread && 'hidden lg:block')}>
            <ul className="max-h-[34rem] divide-y divide-slate-100 overflow-y-auto">
              {conversations.map(({ b, last }) => {
                const meta = EVENT_META[last.type] ?? EVENT_META.note
                const LastIcon = meta.icon
                const isActive = active?.b.id === b.id
                return (
                  <li key={b.id}>
                    <button
                      onClick={() => {
                        setSelectedId(b.id)
                        setMobileThread(true)
                      }}
                      className={cx(
                        'flex w-full items-start gap-3 px-4 py-3 text-left transition-colors',
                        isActive ? 'bg-navy-50/70 dark:bg-white/[0.06]' : 'hover:bg-slate-50/70 dark:hover:bg-white/5',
                      )}
                    >
                      <Avatar officer={officerById(b.officerId)} size="h-8 w-8 text-[11px]" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-[13px] font-semibold text-navy-950 dark:text-white">{b.name}</p>
                          <span className="shrink-0 text-[11px] text-slate-400">{relDate(last.date)}</span>
                        </div>
                        <p className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-slate-500">
                          <LastIcon className="h-3 w-3 shrink-0 text-slate-400" />
                          <span className="truncate">{last.text}</span>
                        </p>
                      </div>
                    </button>
                  </li>
                )
              })}
            </ul>
          </Card>

          {/* ---- conversation thread ---- */}
          {active && (
            <Card pad={false} className={cx('flex-col', mobileThread ? 'flex' : 'hidden lg:flex')}>
              <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-3 dark:border-white/10">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setMobileThread(false)}
                    aria-label="Back to inbox"
                    className="-ml-1.5 rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-navy-900 lg:hidden dark:hover:bg-white/10"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <Avatar officer={officerById(active.b.officerId)} size="h-9 w-9 text-xs" />
                  <div>
                    <p className="text-[13px] font-semibold text-navy-950 dark:text-white">{active.b.name}</p>
                    <p className="text-xs text-slate-400">
                      {active.b.phone} · {active.b.email}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => openLoan(active.b.id)}
                  className="text-xs font-medium text-navy-600 transition-colors hover:text-navy-900"
                >
                  Open file →
                </button>
              </div>

              <ul className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
                {active.comms.map((e, i) => {
                  const meta = EVENT_META[e.type] ?? EVENT_META.note
                  const Icon = meta.icon
                  return (
                    <li key={i} className="flex items-start gap-3">
                      <span className={cx('mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full', meta.cls)}>
                        <Icon className="h-3.5 w-3.5" strokeWidth={1.75} />
                      </span>
                      <div className="min-w-0 flex-1 rounded-xl rounded-tl-sm bg-slate-50 px-3 py-2 dark:bg-white/5">
                        <div className="mb-0.5 flex items-center justify-between gap-2">
                          <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                            {CHANNEL_LABEL[e.type] ?? 'Activity'}
                          </span>
                          <span className="text-[11px] text-slate-400">{fmtDateFull(e.date)}</span>
                        </div>
                        <p className="text-[13px] leading-relaxed text-slate-700 dark:text-slate-200">{e.text}</p>
                      </div>
                    </li>
                  )
                })}
              </ul>

              <div className="border-t border-slate-100 px-5 py-3">
                <ReplyBar b={active.b} connections={connections} onPick={setCompose} />
              </div>
            </Card>
          )}
        </div>
      )}

      {compose && active && (
        <ComposeModal
          b={active.b}
          channel={compose}
          connections={connections}
          officer={officerById(active.b.officerId)}
          onClose={() => setCompose(null)}
        />
      )}
    </div>
  )
}
