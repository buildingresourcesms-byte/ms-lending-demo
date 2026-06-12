import {
  UserPlus,
  FolderOpen,
  FileWarning,
  Landmark,
  KeyRound,
  AlarmClock,
  ArrowRight,
  CheckCircle2,
  Check,
  Hourglass,
} from 'lucide-react'
import { useApp } from '../store.jsx'
import {
  ACTIVE_STATUSES,
  STATUS_STYLES,
  WEEKLY_LEADS,
  relDate,
  fmtDate,
  daysUntil,
  daysInStage,
  isClosedOut,
  rateLockStatus,
  money,
  SKY,
  timeOfDay,
  d,
  addDaysISO,
  weekdayOf,
  calendarEvents,
  CAL_TYPES,
} from '../data.js'
import { Card, Stat, Btn, EmptyState, cx } from '../ui.jsx'
import { PipelineBars, Donut, Sparkline } from '../charts.jsx'
import { EVENT_META } from '../events.jsx'

const STARS = [
  ['14%', '24%'],
  ['22%', '58%'],
  ['30%', '34%'],
  ['18%', '78%'],
  ['40%', '66%'],
  ['52%', '20%'],
]

export default function Dashboard() {
  const { metrics, borrowers, tasks, goBorrowers, go, openLoan, completeTask, seat, currentOfficer } = useApp()
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const sky = SKY[timeOfDay()]
  const firstName = currentOfficer ? currentOfficer.name.split(' ')[0] : null
  const todayLabel = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })

  const mine = seat === 'team' ? borrowers : borrowers.filter((b) => b.officerId === seat)

  const pipeline = ACTIVE_STATUSES.map((s) => ({
    label: s,
    count: mine.filter((b) => b.status === s).length,
    color: STATUS_STYLES[s].bar,
  }))

  const sourceCounts = Object.entries(
    mine.reduce((acc, b) => ((acc[b.source] = (acc[b.source] ?? 0) + 1), acc), {}),
  )
    .map(([label, value]) => ({ label, value }))
    .sort((a, z) => z.value - a.value)

  const thisWeek = WEEKLY_LEADS[WEEKLY_LEADS.length - 1]
  const lastWeek = WEEKLY_LEADS[WEEKLY_LEADS.length - 2]
  const delta = Math.round(((thisWeek - lastWeek) / lastWeek) * 100)

  /* next 7 days for the week-at-a-glance strip */
  const today = d(0)
  const week = Array.from({ length: 7 }, (_, i) => addDaysISO(today, i))
  const weekEvents = calendarEvents(borrowers, tasks, seat)
  const eventsOn = (iso) => weekEvents.filter((e) => e.date === iso)
  const pastDue = weekEvents.filter((e) => e.date < today).length

  return (
    <div className="space-y-5">
      {/* ---------- greeting hero (time-of-day sky) ---------- */}
      <div className={cx('relative overflow-hidden rounded-2xl bg-gradient-to-br p-5 ring-1 ring-black/[0.04] sm:p-6', sky.grad)}>
        {/* decorative sky */}
        <div className="pointer-events-none absolute inset-0">
          {sky.moon &&
            STARS.map(([top, left], i) => (
              <span
                key={i}
                className="animate-twinkle absolute h-1 w-1 rounded-full bg-white"
                style={{ top, left, animationDelay: `${i * 0.45}s` }}
              />
            ))}
          <div className="animate-sunrise absolute -right-4 -top-10">
            <div className="relative">
              <div className={cx('absolute -inset-10 rounded-full blur-2xl', sky.glow)} />
              <div
                className="animate-floaty h-28 w-28 rounded-full sm:h-32 sm:w-32"
                style={{ background: sky.orbBg, boxShadow: sky.shadow }}
              />
            </div>
          </div>
        </div>

        {/* content */}
        <div className="relative z-10 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className={cx('text-xs', sky.muted)}>{todayLabel}</p>
            <h1 className={cx('mt-0.5 text-2xl font-semibold tracking-tight', sky.text)}>
              {greeting}
              {firstName ? `, ${firstName}` : ''}
            </h1>
            <p className={cx('mt-1 text-[13px]', sky.muted)}>
              {firstName
                ? 'Here’s your day — your borrowers, tasks, and follow-ups.'
                : 'Here’s where every borrower, document, and loan file stands today.'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Btn variant="outline" onClick={() => goBorrowers()}>
              View pipeline
            </Btn>
            <Btn onClick={() => go('tasks')}>
              Today’s tasks
              <span className="rounded bg-white/15 px-1.5 text-xs tabular-nums">{metrics.todays.length}</span>
            </Btn>
          </div>
        </div>
      </div>

      {/* ---------- stat cards ---------- */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Stat
          icon={UserPlus}
          label="New leads this week"
          value={metrics.newThisWeek.length}
          accent="sky"
          onClick={() => goBorrowers({ status: 'New Lead' })}
        />
        <Stat
          icon={FolderOpen}
          label="Active loan files"
          value={metrics.active.length}
          accent="navy"
          onClick={() => goBorrowers()}
        />
        <Stat
          icon={FileWarning}
          label="Waiting on documents"
          value={metrics.waitingDocs.length}
          accent="amber"
          onClick={() => goBorrowers({ status: 'Documents Needed' })}
        />
        <Stat
          icon={Landmark}
          label="In underwriting"
          value={metrics.underwriting.length}
          accent="violet"
          onClick={() => goBorrowers({ status: 'Underwriting' })}
        />
        <Stat
          icon={KeyRound}
          label="Ready to close"
          value={metrics.readyToClose.length}
          accent="sage"
          onClick={() => goBorrowers({ status: 'Clear to Close' })}
        />
        <Stat
          icon={AlarmClock}
          label="Overdue follow-ups"
          value={metrics.overdue.length}
          accent="rose"
          onClick={() => goBorrowers({ overdue: true })}
        />
      </div>

      {/* ---------- charts ---------- */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card title="Pipeline by stage" sub="Click a stage to see those files">
          <PipelineBars data={pipeline} onPick={(s) => goBorrowers({ status: s })} />
        </Card>
        <Card title="Lead sources" sub="Where this pipeline came from">
          <Donut segments={sourceCounts} />
        </Card>
        <Card title="New leads" sub="Last 8 weeks">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-2xl font-semibold tracking-tight text-navy-950 tabular-nums">{thisWeek}</p>
              <p className="text-xs text-slate-400">this week</p>
            </div>
            <p className={cx('text-xs font-medium tabular-nums', delta >= 0 ? 'text-sage-700' : 'text-rose-600')}>
              {delta >= 0 ? '+' : ''}
              {delta}% vs last week
            </p>
          </div>
          <Sparkline values={WEEKLY_LEADS} className="mt-3 h-16 w-full" />
        </Card>
      </div>

      {/* ---------- your week (calendar strip) ---------- */}
      <Card
        title="Your week"
        sub="Closings, rate locks, follow-ups & tasks — tap a day to open the calendar"
        action={
          <button
            onClick={() => go('calendar')}
            className="flex items-center gap-1 text-xs font-medium text-navy-600 transition-colors hover:text-navy-900 dark:text-slate-300 dark:hover:text-white"
          >
            Open calendar <ArrowRight className="h-3 w-3" />
          </button>
        }
      >
        {pastDue > 0 && (
          <button
            onClick={() => go('calendar')}
            className="mb-3 flex w-full items-center gap-2 rounded-lg bg-rose-50 px-3 py-2 text-left text-xs font-medium text-rose-700 ring-1 ring-inset ring-rose-600/20 transition-colors hover:bg-rose-100/70 dark:bg-rose-500/15"
          >
            <AlarmClock className="h-3.5 w-3.5 shrink-0" />
            {pastDue} item{pastDue > 1 ? 's' : ''} past due — see them on the calendar
          </button>
        )}
        <div className="grid grid-cols-7 gap-1.5">
          {week.map((iso) => {
            const evts = eventsOn(iso)
            const isToday = iso === today
            const dow = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][weekdayOf(iso)]
            return (
              <button
                key={iso}
                onClick={() => go('calendar')}
                title={evts.length ? `${evts.length} event${evts.length > 1 ? 's' : ''}` : 'Free'}
                className={cx(
                  'flex min-h-[4.25rem] flex-col items-center gap-1 rounded-xl border p-2 transition-all duration-150 active:scale-[0.97]',
                  isToday
                    ? 'border-navy-800 bg-navy-900 text-white dark:border-white/40'
                    : 'border-slate-200/80 bg-white hover:border-navy-300/70 hover:bg-slate-50/60 dark:border-white/10 dark:bg-navy-900 dark:hover:border-white/25',
                )}
              >
                <span className={cx('text-[10px] font-semibold uppercase', isToday ? 'text-white/70' : 'text-slate-400')}>
                  {dow}
                </span>
                <span className={cx('text-sm font-semibold tabular-nums', isToday ? 'text-white' : 'text-navy-950 dark:text-white')}>
                  {Number(iso.slice(8, 10))}
                </span>
                <span className="flex flex-wrap items-center justify-center gap-0.5">
                  {evts.slice(0, 4).map((e) => (
                    <span key={e.id} className={cx('h-1.5 w-1.5 rounded-full', CAL_TYPES[e.type].chip)} />
                  ))}
                  {evts.length > 4 && (
                    <span className={cx('text-[9px] font-medium', isToday ? 'text-white/70' : 'text-slate-400')}>
                      +{evts.length - 4}
                    </span>
                  )}
                </span>
              </button>
            )
          })}
        </div>
      </Card>

      {/* ---------- work lists ---------- */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* today's tasks */}
        <Card
          title="Today’s tasks"
          sub={`${metrics.todays.length} due or overdue`}
          action={
            <button
              onClick={() => go('tasks')}
              className="flex items-center gap-1 text-xs font-medium text-navy-600 transition-colors hover:text-navy-900"
            >
              View board <ArrowRight className="h-3 w-3" />
            </button>
          }
          pad={false}
        >
          {metrics.todays.length === 0 ? (
            <EmptyState icon={CheckCircle2} title="All caught up" sub="Nothing due today." />
          ) : (
            <ul className="divide-y divide-slate-100 px-5">
              {metrics.todays.slice(0, 6).map((t) => {
                const b = borrowers.find((x) => x.id === t.borrowerId)
                const overdue = daysUntil(t.due) < 0
                return (
                  <li key={t.id} className="-mx-2 flex items-center gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-slate-50/70">
                    <button
                      onClick={() => completeTask(t.id)}
                      title="Mark complete"
                      aria-label={`Mark "${t.title}" complete`}
                      className="grid h-5 w-5 shrink-0 place-items-center rounded-full border-[1.5px] border-slate-300 text-transparent transition-colors hover:border-sage-600 hover:bg-sage-50 hover:text-sage-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-500/40"
                    >
                      <Check className="h-3 w-3" strokeWidth={3} />
                    </button>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] text-slate-700">{t.title}</p>
                      {b && (
                        <button
                          onClick={() => openLoan(b.id)}
                          className="text-xs text-slate-400 transition-colors hover:text-navy-700"
                        >
                          {b.name}
                        </button>
                      )}
                    </div>
                    <span className={cx('text-xs tabular-nums', overdue ? 'font-medium text-rose-600' : 'text-slate-400')}>
                      {relDate(t.due)}
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
        </Card>

        {/* needs attention */}
        <Card title="Needs attention" sub="Overdue follow-ups & files stuck in a stage" pad={false}>
          {metrics.overdue.length === 0 && metrics.stuck.length === 0 ? (
            <EmptyState icon={CheckCircle2} title="Nothing slipping" sub="Every file is moving along." />
          ) : (
            <ul className="divide-y divide-slate-100 px-5">
              {metrics.overdue.map((b) => (
                <li key={b.id} className="flex items-center gap-3 py-2.5">
                  <AlarmClock className="h-4 w-4 shrink-0 text-rose-500" strokeWidth={1.75} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium text-slate-700">{b.name}</p>
                    <p className="text-xs text-slate-400">
                      Follow-up {-daysUntil(b.nextFollowUp)}d overdue · {b.status}
                    </p>
                  </div>
                  <button
                    onClick={() => openLoan(b.id)}
                    className="text-xs font-medium text-navy-600 transition-colors hover:text-navy-900"
                  >
                    Open
                  </button>
                </li>
              ))}
              {metrics.stuck
                .filter((b) => !metrics.overdue.includes(b))
                .map((b) => (
                  <li key={b.id} className="flex items-center gap-3 py-2.5">
                    <Hourglass className="h-4 w-4 shrink-0 text-amber-500" strokeWidth={1.75} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-medium text-slate-700">{b.name}</p>
                      <p className="text-xs text-slate-400">
                        {daysInStage(b)} days in {b.status}
                      </p>
                    </div>
                    <button
                      onClick={() => openLoan(b.id)}
                      className="text-xs font-medium text-navy-600 transition-colors hover:text-navy-900"
                    >
                      Open
                    </button>
                  </li>
                ))}
            </ul>
          )}
        </Card>

        {/* recent activity */}
        <Card title="Recent activity" sub="Across all loan files" pad={false}>
          <ul className="divide-y divide-slate-100 px-5">
            {metrics.activity.map((e, i) => {
              const meta = EVENT_META[e.type] ?? EVENT_META.note
              const Icon = meta.icon
              return (
                <li key={i} className="flex items-start gap-3 py-2.5">
                  <span className={cx('mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full', meta.cls)}>
                    <Icon className="h-3 w-3" strokeWidth={1.75} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] text-slate-700">{e.text}</p>
                    <button
                      onClick={() => openLoan(e.borrowerId)}
                      className="text-xs text-slate-400 transition-colors hover:text-navy-700"
                    >
                      {e.borrower} · {relDate(e.date)}
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        </Card>
      </div>

    </div>
  )
}
