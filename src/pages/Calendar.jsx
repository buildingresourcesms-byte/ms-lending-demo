import { useMemo, useState, useEffect } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  Landmark,
  KeyRound,
  PhoneCall,
  ListChecks,
  CalendarDays,
  Zap,
  Plus,
  Move,
  X,
  Users,
  Video,
  ExternalLink,
} from 'lucide-react'
import { useApp } from '../store.jsx'
import { backendProvider, fetchCalendar } from '../api.js'
import {
  calendarEvents,
  CAL_TYPES,
  addDaysISO,
  weekdayOf,
  monthLabel,
  officerById,
  isClosedOut,
  fmtDateFull,
  fmtDate,
  relDate,
  daysUntil,
  d,
} from '../data.js'
import { PageHeader, Card, Avatar, Btn, Modal, Field, Select, inputCls, EmptyState, cx } from '../ui.jsx'

/* ---------- schedule something on a chosen day ---------- */
function ScheduleModal({ date, candidates, seat, onClose }) {
  const { setFollowUp, addTask } = useApp()
  const [kind, setKind] = useState('followup')
  const [borrowerId, setBorrowerId] = useState(candidates[0]?.id)
  const [title, setTitle] = useState('')
  const [due, setDue] = useState(date)

  const submit = (e) => {
    e.preventDefault()
    const b = candidates.find((x) => x.id === borrowerId)
    if (!b) return
    if (kind === 'followup') {
      setFollowUp(b.id, due)
    } else {
      if (!title.trim()) return
      addTask({
        title: title.trim(),
        borrowerId: b.id,
        officerId: seat === 'team' ? b.officerId : seat,
        due,
        priority: 'Medium',
      })
    }
    onClose()
  }

  return (
    <Modal open onClose={onClose} title={`Schedule for ${fmtDateFull(date)}`} sub="Put it on the calendar — it shows up everywhere.">
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="What is it?">
            <Select
              value={kind}
              onChange={setKind}
              options={[
                { value: 'followup', label: 'Follow-up call' },
                { value: 'task', label: 'Task' },
              ]}
            />
          </Field>
          <Field label="Borrower">
            <Select
              value={borrowerId}
              onChange={setBorrowerId}
              options={candidates.map((b) => ({ value: b.id, label: b.name }))}
            />
          </Field>
        </div>
        {kind === 'task' && (
          <Field label="What needs to happen?">
            <input
              autoFocus
              className={inputCls}
              placeholder="e.g. Confirm appraisal appointment"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </Field>
        )}
        <Field label="Date">
          <input type="date" className={inputCls} value={due} onChange={(e) => setDue(e.target.value)} />
        </Field>
        <div className="flex justify-end gap-2 pt-1">
          <Btn variant="ghost" onClick={onClose}>
            Cancel
          </Btn>
          <Btn type="submit" disabled={kind === 'task' && !title.trim()}>
            <Plus className="h-3.5 w-3.5" /> Schedule
          </Btn>
        </div>
      </form>
    </Modal>
  )
}

const TYPE_ICON = { closing: Landmark, lock: KeyRound, followup: PhoneCall, task: ListChecks, meeting: Users }
const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

/* "2026-06-20T14:00:00.0000000" (already local Central) → "2:00 PM" */
const fmtTime = (dt) => {
  if (!dt) return ''
  let [h, m] = dt.slice(11, 16).split(':').map(Number)
  const ap = h >= 12 ? 'PM' : 'AM'
  h = h % 12 || 12
  return `${h}:${String(m).padStart(2, '0')} ${ap}`
}

/* a real Outlook event → the calendar's event shape (type 'meeting') */
const toCalEvent = (m) => ({
  id: 'mtg-' + m.id,
  date: (m.start?.dateTime || '').slice(0, 10),
  type: 'meeting',
  title: m.subject || '(no title)',
  sub: m.allDay
    ? 'All day'
    : `${fmtTime(m.start?.dateTime)}–${fmtTime(m.end?.dateTime)}${m.location ? ' · ' + m.location : ''}`,
  online: m.online,
  webLink: m.webLink,
})

/* first day of the month containing `iso` */
const firstOfMonth = (iso) => iso.slice(0, 8) + '01'
/* shift a YYYY-MM-01 iso by n months, purely numerically (no TZ risk) */
const shiftMonth = (iso, n) => {
  let y = Number(iso.slice(0, 4))
  let m = Number(iso.slice(5, 7)) - 1 + n
  y += Math.floor(m / 12)
  m = ((m % 12) + 12) % 12
  return `${y}-${String(m + 1).padStart(2, '0')}-01`
}

export default function Calendar() {
  const { borrowers, tasks, seat, currentOfficer, openLoan, go, completeTask, setFollowUp, retargetTask } = useApp()
  const today = d(0)
  const [month, setMonth] = useState(() => firstOfMonth(today))
  const [selected, setSelected] = useState(today)
  const [scheduleOpen, setScheduleOpen] = useState(false)
  const [moving, setMoving] = useState(null) // a followup/task event being rescheduled
  const [liveEvents, setLiveEvents] = useState([]) // real Outlook meetings (when connected)

  // pull in the real calendar when a mailbox is connected; demo stays untouched
  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const p = await backendProvider()
        if (!alive || p !== 'outlook') return
        const evs = await fetchCalendar({ days: 45 })
        if (alive) setLiveEvents(evs.map(toCalEvent).filter((e) => e.date))
      } catch {
        /* no backend / not reachable — stay on demo pipeline events */
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  const candidates = useMemo(
    () => (seat === 'team' ? borrowers : borrowers.filter((b) => b.officerId === seat)).filter((b) => !isClosedOut(b)),
    [borrowers, seat],
  )

  const dropOn = (iso) => {
    if (!moving) return
    if (moving.type === 'followup') setFollowUp(moving.borrowerId, iso)
    else if (moving.type === 'task') retargetTask(moving.id.slice(1), iso)
    setMoving(null)
    setSelected(iso)
  }

  const events = useMemo(
    () => [...calendarEvents(borrowers, tasks, seat), ...liveEvents],
    [borrowers, tasks, seat, liveEvents],
  )
  const byDate = useMemo(() => {
    const map = {}
    events.forEach((e) => {
      ;(map[e.date] ??= []).push(e)
    })
    return map
  }, [events])

  /* 42-cell grid starting the Sunday on/before the 1st */
  const cells = useMemo(() => {
    const start = addDaysISO(month, -weekdayOf(month))
    return Array.from({ length: 42 }, (_, i) => addDaysISO(start, i))
  }, [month])

  const inMonth = (iso) => iso.slice(0, 7) === month.slice(0, 7)
  const monthEventCount = events.filter((e) => inMonth(e.date)).length
  const selectedEvents = byDate[selected] ?? []
  const overdueOpen = events.filter((e) => e.date < today).length

  const goToday = () => {
    setMonth(firstOfMonth(today))
    setSelected(today)
  }

  return (
    <div>
      <PageHeader
        title={currentOfficer ? `${currentOfficer.name.split(' ')[0]}’s Calendar` : 'Pipeline Calendar'}
        sub="Closings, rate locks, follow-ups, and task deadlines — your whole pipeline on one calendar."
        actions={
          overdueOpen > 0 && (
            <span className="flex items-center gap-1.5 rounded-lg bg-rose-50 px-2.5 py-1.5 text-xs font-medium text-rose-700 ring-1 ring-inset ring-rose-600/20 dark:bg-rose-500/15">
              <Zap className="h-3.5 w-3.5" /> {overdueOpen} past due
            </span>
          )
        }
      />

      {/* month switcher + legend */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setMonth((m) => shiftMonth(m, -1))}
            aria-label="Previous month"
            className="rounded-lg border border-slate-300/70 bg-white p-1.5 text-slate-500 transition-colors hover:border-slate-400/70 hover:text-navy-900 dark:border-white/10 dark:bg-navy-900 dark:hover:text-white"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => setMonth((m) => shiftMonth(m, 1))}
            aria-label="Next month"
            className="rounded-lg border border-slate-300/70 bg-white p-1.5 text-slate-500 transition-colors hover:border-slate-400/70 hover:text-navy-900 dark:border-white/10 dark:bg-navy-900 dark:hover:text-white"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <h2 className="min-w-40 text-lg font-semibold tracking-tight text-navy-950 dark:text-white">
          {monthLabel(month)}
        </h2>
        <Btn variant="outline" sm onClick={goToday}>
          Today
        </Btn>
        <span className="text-xs text-slate-400 tabular-nums">{monthEventCount} events</span>
        <div className="ml-auto flex flex-wrap items-center gap-3">
          {Object.entries(CAL_TYPES).map(([k, t]) => (
            <span key={k} className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
              <span className={cx('h-2 w-2 rounded-full', t.chip)} /> {t.label}
            </span>
          ))}
        </div>
      </div>

      {moving && (
        <div className="animate-slidein mb-3 flex items-center gap-2.5 rounded-xl border border-navy-300/70 bg-navy-50 px-3 py-2 text-[13px] font-medium text-navy-900 dark:border-white/20 dark:bg-white/10 dark:text-white">
          <Move className="h-4 w-4 shrink-0" />
          <span className="min-w-0 flex-1 truncate">
            Moving “{moving.title}” — tap the new day
          </span>
          <button
            onClick={() => setMoving(null)}
            className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-slate-500 transition-colors hover:bg-white hover:text-navy-900 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
          >
            <X className="h-3.5 w-3.5" /> Cancel
          </button>
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-[1fr_20rem]">
        {/* ---------- month grid ---------- */}
        <Card pad={false} className={cx('overflow-hidden', moving && 'ring-2 ring-navy-400/50')}>
          <div className="grid grid-cols-7 border-b border-slate-100 dark:border-white/10">
            {DOW.map((w) => (
              <p key={w} className="py-2 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                <span className="sm:hidden">{w[0]}</span>
                <span className="hidden sm:inline">{w}</span>
              </p>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {cells.map((iso, i) => {
              const evts = byDate[iso] ?? []
              const isToday = iso === today
              const isSelected = iso === selected
              const dim = !inMonth(iso)
              const weekend = i % 7 === 0 || i % 7 === 6
              return (
                <button
                  key={iso}
                  onClick={() => (moving ? dropOn(iso) : setSelected(iso))}
                  className={cx(
                    moving && 'cursor-crosshair',
                    'relative flex min-h-[4.5rem] flex-col items-stretch gap-1 border-b border-r border-slate-100 p-1.5 text-left transition-colors sm:min-h-[5.5rem] dark:border-white/[0.06]',
                    (i + 1) % 7 === 0 && 'border-r-0',
                    i >= 35 && 'border-b-0',
                    weekend && !isSelected && 'bg-slate-50/50 dark:bg-white/[0.02]',
                    isSelected ? 'bg-navy-50/80 dark:bg-white/[0.08]' : 'hover:bg-slate-50 dark:hover:bg-white/[0.04]',
                  )}
                >
                  <span
                    className={cx(
                      'grid h-6 w-6 place-items-center rounded-full text-xs tabular-nums',
                      isToday
                        ? 'bg-navy-900 font-bold text-white dark:bg-white dark:text-navy-950'
                        : dim
                          ? 'text-slate-300 dark:text-slate-600'
                          : 'font-medium text-slate-600 dark:text-slate-300',
                    )}
                  >
                    {Number(iso.slice(8, 10))}
                  </span>
                  {/* event chips: bars on ≥sm, dots on mobile */}
                  <span className="hidden flex-col gap-0.5 sm:flex">
                    {evts.slice(0, 3).map((e) => (
                      <span
                        key={e.id}
                        className={cx('truncate rounded px-1 py-px text-[10px] font-medium text-white', CAL_TYPES[e.type].chip, dim && 'opacity-50')}
                      >
                        {e.title}
                      </span>
                    ))}
                    {evts.length > 3 && (
                      <span className="px-1 text-[10px] font-medium text-slate-400">+{evts.length - 3} more</span>
                    )}
                  </span>
                  <span className="flex flex-wrap gap-0.5 sm:hidden">
                    {evts.slice(0, 4).map((e) => (
                      <span key={e.id} className={cx('h-1.5 w-1.5 rounded-full', CAL_TYPES[e.type].chip, dim && 'opacity-50')} />
                    ))}
                  </span>
                </button>
              )
            })}
          </div>
        </Card>

        {/* ---------- selected-day panel ---------- */}
        <Card
          title={fmtDateFull(selected)}
          sub={selected === today ? 'Today' : relDate(selected)}
          pad={false}
          action={
            <Btn variant="soft" sm onClick={() => setScheduleOpen(true)} disabled={candidates.length === 0}>
              <Plus className="h-3 w-3" /> Schedule
            </Btn>
          }
        >
          {selectedEvents.length === 0 ? (
            <EmptyState icon={CalendarDays} title="Nothing on this day" sub="Pick a day with colored chips to see its events." />
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-white/[0.06]">
              {selectedEvents.map((e) => {
                const Icon = TYPE_ICON[e.type]
                const past = e.date < today
                return (
                  <li key={e.id} className="flex items-start gap-3 px-4 py-3">
                    <span className={cx('mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg ring-1 ring-inset', CAL_TYPES[e.type].soft)}>
                      <Icon className="h-4 w-4" strokeWidth={1.75} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-medium text-navy-950 dark:text-white">{e.title}</p>
                      <p className="truncate text-xs text-slate-400">
                        {CAL_TYPES[e.type].label} · {e.sub}
                        {past && <span className="ml-1 font-medium text-rose-600">· {-daysUntil(e.date)}d overdue</span>}
                      </p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1">
                        {e.borrowerId && (
                          <button
                            onClick={() => openLoan(e.borrowerId)}
                            className="text-xs font-medium text-navy-600 transition-colors hover:text-navy-900 dark:text-slate-300 dark:hover:text-white"
                          >
                            Open file →
                          </button>
                        )}
                        {e.isTask && (
                          <button
                            onClick={() => completeTask(e.id.slice(1))}
                            className="text-xs font-medium text-sage-700 transition-colors hover:text-sage-800"
                          >
                            Mark done ✓
                          </button>
                        )}
                        {(e.type === 'followup' || e.type === 'task') && (
                          <button
                            onClick={() => setMoving(e)}
                            className="flex items-center gap-1 text-xs font-medium text-slate-500 transition-colors hover:text-navy-900 dark:text-slate-400 dark:hover:text-white"
                          >
                            <Move className="h-3 w-3" /> Reschedule
                          </button>
                        )}
                        {e.type === 'meeting' && e.online && (
                          <a
                            href={e.online}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-xs font-medium text-teal-700 transition-colors hover:text-teal-800"
                          >
                            <Video className="h-3 w-3" /> Join
                          </a>
                        )}
                        {e.type === 'meeting' && !e.online && e.webLink && (
                          <a
                            href={e.webLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-xs font-medium text-slate-500 transition-colors hover:text-navy-900 dark:text-slate-400 dark:hover:text-white"
                          >
                            <ExternalLink className="h-3 w-3" /> Open in Outlook
                          </a>
                        )}
                      </div>
                    </div>
                    {e.borrowerId && (
                      <Avatar
                        officer={officerById(borrowers.find((b) => b.id === e.borrowerId)?.officerId ?? 'julene')}
                        size="h-6 w-6 text-[9px]"
                      />
                    )}
                  </li>
                )
              })}
            </ul>
          )}
          <div className="border-t border-slate-100 px-4 py-2.5 dark:border-white/10">
            <button
              onClick={() => go('tasks')}
              className="text-xs font-medium text-navy-600 transition-colors hover:text-navy-900 dark:text-slate-300 dark:hover:text-white"
            >
              Open the task board →
            </button>
          </div>
        </Card>
      </div>

      {scheduleOpen && (
        <ScheduleModal
          date={selected}
          candidates={candidates}
          seat={seat}
          onClose={() => setScheduleOpen(false)}
        />
      )}
    </div>
  )
}
