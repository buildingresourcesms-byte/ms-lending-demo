import { Landmark, KeyRound, CalendarDays } from 'lucide-react'
import { useApp } from '../store.jsx'
import {
  officerById,
  money,
  fmtDateFull,
  relDate,
  daysUntil,
  isClosedOut,
} from '../data.js'
import { PageHeader, Card, Avatar, EmptyState, cx } from '../ui.jsx'

const WINDOW = 45 // days out

export default function Calendar() {
  const { borrowers, seat, currentOfficer, openLoan } = useApp()
  const scoped = (seat === 'team' ? borrowers : borrowers.filter((b) => b.officerId === seat)).filter(
    (b) => !isClosedOut(b),
  )

  const events = []
  scoped.forEach((b) => {
    if (b.estClosing) {
      const dd = daysUntil(b.estClosing)
      if (dd >= 0 && dd <= WINDOW) events.push({ key: 'c' + b.id, date: b.estClosing, type: 'closing', b })
    }
    if (b.rateLockExpires) {
      const dd = daysUntil(b.rateLockExpires)
      if (dd >= -7 && dd <= WINDOW) events.push({ key: 'l' + b.id, date: b.rateLockExpires, type: 'lock', b })
    }
  })
  events.sort((a, z) => (a.date < z.date ? -1 : a.date > z.date ? 1 : 0))

  const groups = []
  events.forEach((e) => {
    const last = groups[groups.length - 1]
    if (last && last.date === e.date) last.items.push(e)
    else groups.push({ date: e.date, items: [e] })
  })

  const closingCount = events.filter((e) => e.type === 'closing').length
  const lockCount = events.filter((e) => e.type === 'lock').length

  return (
    <div>
      <PageHeader
        title={currentOfficer ? `${currentOfficer.name.split(' ')[0]}’s Calendar` : 'Pipeline Calendar'}
        sub={`Closings and rate-lock expirations in the next ${WINDOW} days.`}
      />

      {/* legend / summary */}
      <div className="mb-4 flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
        <span className="flex items-center gap-1.5">
          <span className="grid h-5 w-5 place-items-center rounded-md bg-sage-50 text-sage-600 dark:bg-sage-500/15">
            <Landmark className="h-3 w-3" />
          </span>
          {closingCount} closing{closingCount === 1 ? '' : 's'}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="grid h-5 w-5 place-items-center rounded-md bg-amber-50 text-amber-600 dark:bg-amber-500/15">
            <KeyRound className="h-3 w-3" />
          </span>
          {lockCount} rate lock{lockCount === 1 ? '' : 's'}
        </span>
      </div>

      {groups.length === 0 ? (
        <div className="rounded-xl border border-slate-200/80 bg-white dark:border-white/10 dark:bg-navy-900">
          <EmptyState icon={CalendarDays} title="Nothing scheduled" sub={`No closings or lock expirations in the next ${WINDOW} days.`} />
        </div>
      ) : (
        <div className="space-y-4">
          {groups.map((g) => {
            const dd = daysUntil(g.date)
            const isPast = dd < 0
            return (
              <div key={g.date} className="flex flex-col gap-2 sm:flex-row sm:gap-3">
                {/* date rail */}
                <div className="w-full shrink-0 pt-0.5 sm:w-28">
                  <p className={cx('text-[13px] font-semibold', isPast ? 'text-rose-600' : 'text-navy-950 dark:text-white')}>
                    {fmtDateFull(g.date)}
                  </p>
                  <p className="text-xs text-slate-400">{relDate(g.date)}</p>
                </div>
                {/* events */}
                <div className="flex-1 space-y-2">
                  {g.items.map((e) => {
                    const officer = officerById(e.b.officerId)
                    const isClosing = e.type === 'closing'
                    const lockExpired = e.type === 'lock' && daysUntil(e.date) < 0
                    return (
                      <button
                        key={e.key}
                        onClick={() => openLoan(e.b.id)}
                        className={cx(
                          'flex w-full items-center gap-3 rounded-xl border bg-white p-3 text-left shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition-colors hover:bg-slate-50/70 dark:bg-navy-900 dark:hover:bg-white/5',
                          isClosing
                            ? 'border-sage-200/80 dark:border-sage-500/25'
                            : lockExpired
                              ? 'border-rose-200 dark:border-rose-500/30'
                              : 'border-amber-200/80 dark:border-amber-500/25',
                        )}
                      >
                        <span
                          className={cx(
                            'grid h-8 w-8 shrink-0 place-items-center rounded-lg',
                            isClosing
                              ? 'bg-sage-50 text-sage-600 dark:bg-sage-500/15'
                              : lockExpired
                                ? 'bg-rose-50 text-rose-600 dark:bg-rose-500/15'
                                : 'bg-amber-50 text-amber-600 dark:bg-amber-500/15',
                          )}
                        >
                          {isClosing ? <Landmark className="h-4 w-4" /> : <KeyRound className="h-4 w-4" />}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[13px] font-medium text-navy-950 dark:text-white">{e.b.name}</p>
                          <p className="truncate text-xs text-slate-400">
                            {isClosing ? 'Closing' : lockExpired ? 'Rate lock expired' : 'Rate lock expires'} · {money(e.b.amount)} · {e.b.status}
                          </p>
                        </div>
                        <Avatar officer={officer} size="h-6 w-6 text-[9px]" />
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
