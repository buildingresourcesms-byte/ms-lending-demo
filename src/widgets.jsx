import {
  CalendarDays,
  ListChecks,
  FolderOpen,
  AlarmClock,
  Hourglass,
  BarChart3,
  Building2,
  Activity,
  PieChart,
  TrendingUp,
  KeyRound,
  ArrowRight,
  Check,
  CheckCircle2,
  UserPlus,
  FileWarning,
  Landmark,
  FileText,
  Upload,
  LayoutGrid,
  MessageSquare,
  Inbox as InboxIcon,
  Image as ImageIcon,
} from 'lucide-react'
import { useApp } from './store.jsx'
import {
  ACTIVE_STATUSES,
  STATUS_STYLES,
  WEEKLY_LEADS,
  CAL_TYPES,
  calendarEvents,
  docProgress,
  isClosedOut,
  daysUntil,
  daysInStage,
  relDate,
  fmtDate,
  money,
  AGENTS,
  agentDeals,
  BOARD_COLUMNS,
  UNACTIVE_COLUMN,
  defaultBoardFor,
  d,
} from './data.js'
import { Stat, StatusBadge, ProgressBar, Avatar, EmptyState, cx } from './ui.jsx'
import { PipelineBars, Donut, Sparkline } from './charts.jsx'

const scopeBorrowers = (borrowers, seat) => (seat === 'team' ? borrowers : borrowers.filter((b) => b.officerId === seat))
const initialsOf = (name) =>
  name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')

/* ---------- shared widget shell — header navigates to the full page ---------- */
export function WidgetCard({ icon: Icon, title, sub, onOpen, openLabel = 'View all', children, pad = true }) {
  return (
    <section className="flex h-full flex-col overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-[0_1px_3px_rgba(16,24,40,0.06)] dark:border-white/10 dark:bg-navy-900">
      <button
        onClick={onOpen}
        className="group flex w-full items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 text-left transition-colors hover:bg-slate-50/60 dark:border-white/10 dark:hover:bg-white/5"
      >
        <span className="flex min-w-0 items-center gap-2">
          {Icon && <Icon className="h-4 w-4 shrink-0 text-navy-500 dark:text-slate-300" strokeWidth={1.75} />}
          <span className="min-w-0">
            <span className="block truncate text-[13px] font-semibold text-navy-950 dark:text-white">{title}</span>
            {sub && <span className="block truncate text-xs text-slate-400">{sub}</span>}
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-navy-600 opacity-60 transition-opacity group-hover:opacity-100 sm:opacity-0 dark:text-slate-300">
          {openLabel} <ArrowRight className="h-3 w-3" />
        </span>
      </button>
      <div className={cx(pad ? 'px-4 py-3.5' : 'py-1', 'flex-1')}>{children}</div>
    </section>
  )
}

/* ============================ widgets ============================ */

/* ⭐ Open loans — interactive borrower thumbnails */
function OpenLoansWidget() {
  const { borrowers, seat, openLoan, goBorrowers } = useApp()
  const mine = scopeBorrowers(borrowers, seat).filter((b) => !isClosedOut(b))
  const sorted = [...mine].sort((a, z) => {
    const ao = a.nextFollowUp && daysUntil(a.nextFollowUp) < 0 ? 0 : 1
    const zo = z.nextFollowUp && daysUntil(z.nextFollowUp) < 0 ? 0 : 1
    if (ao !== zo) return ao - zo
    return (a.nextFollowUp ?? '9999') < (z.nextFollowUp ?? '9999') ? -1 : 1
  })
  const shown = sorted.slice(0, 8)
  return (
    <WidgetCard
      icon={FolderOpen}
      title="Open loans"
      sub={`${mine.length} borrower${mine.length === 1 ? '' : 's'} in progress`}
      onOpen={() => goBorrowers()}
    >
      {shown.length === 0 ? (
        <EmptyState icon={FolderOpen} title="No open loans" sub="New files will show up here." />
      ) : (
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-4">
          {shown.map((b) => {
            const dp = docProgress(b)
            const overdue = b.nextFollowUp && daysUntil(b.nextFollowUp) < 0
            const dot = STATUS_STYLES[b.status]?.dot ?? 'bg-slate-400'
            return (
              <button
                key={b.id}
                onClick={() => openLoan(b.id)}
                className="group flex flex-col rounded-xl border border-slate-200/80 p-3 text-left transition-all duration-150 hover:-translate-y-0.5 hover:border-navy-300/70 hover:shadow-[0_8px_24px_-14px_rgba(16,24,40,0.25)] active:scale-[0.98] dark:border-white/10 dark:hover:border-white/25"
              >
                <div className="flex items-center gap-2">
                  <span className={cx('grid h-8 w-8 shrink-0 place-items-center rounded-full text-[11px] font-semibold text-white', dot)}>
                    {initialsOf(b.name)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium text-navy-950 dark:text-white">{b.name.split(' ')[0]} {b.name.split(' ')[1]?.[0] ?? ''}.</p>
                    <p className="truncate text-[11px] text-slate-400 tabular-nums">{money(b.amount)}</p>
                  </div>
                </div>
                <div className="mt-2"><StatusBadge status={b.status} /></div>
                <div className="mt-2 flex items-center gap-2">
                  <ProgressBar pct={dp.pct} className="h-1 flex-1" />
                  <span className="text-[10px] text-slate-400 tabular-nums">{dp.done}/{dp.total}</span>
                </div>
                <p className={cx('mt-1.5 text-[11px] tabular-nums', overdue ? 'font-medium text-rose-600' : 'text-slate-400')}>
                  {overdue ? `${-daysUntil(b.nextFollowUp)}d overdue` : `follow up ${relDate(b.nextFollowUp)}`}
                </p>
              </button>
            )
          })}
        </div>
      )}
      {mine.length > shown.length && (
        <button
          onClick={() => goBorrowers()}
          className="mt-3 w-full rounded-lg border border-slate-200/80 py-2 text-xs font-medium text-navy-600 transition-colors hover:bg-slate-50 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5"
        >
          View all {mine.length} borrowers →
        </button>
      )}
    </WidgetCard>
  )
}

/* 📅 Today — daily calendar agenda */
function AgendaWidget() {
  const { borrowers, tasks, seat, openLoan, go } = useApp()
  const today = d(0)
  const events = calendarEvents(borrowers, tasks, seat)
  const todays = events.filter((e) => e.date === today)
  const overdue = events.filter((e) => e.date < today)
  return (
    <WidgetCard icon={CalendarDays} title="Today" sub={new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })} onOpen={() => go('calendar')} openLabel="Calendar" pad={false}>
      {overdue.length > 0 && (
        <button
          onClick={() => go('calendar')}
          className="mx-4 mt-3 flex w-[calc(100%-2rem)] items-center gap-2 rounded-lg bg-rose-50 px-3 py-2 text-left text-xs font-medium text-rose-700 ring-1 ring-inset ring-rose-600/20 transition-colors hover:bg-rose-100/70 dark:bg-rose-500/15"
        >
          <AlarmClock className="h-3.5 w-3.5 shrink-0" /> {overdue.length} item{overdue.length > 1 ? 's' : ''} past due
        </button>
      )}
      {todays.length === 0 ? (
        <EmptyState icon={CheckCircle2} title="Nothing scheduled today" sub="Enjoy the clear runway." />
      ) : (
        <ul className="divide-y divide-slate-100 px-4 dark:divide-white/[0.06]">
          {todays.map((e) => (
            <li key={e.id} className="flex items-center gap-2.5 py-2.5">
              <span className={cx('h-2 w-2 shrink-0 rounded-full', CAL_TYPES[e.type].chip)} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-medium text-slate-700 dark:text-slate-200">{e.title}</p>
                <p className="truncate text-xs text-slate-400">{CAL_TYPES[e.type].label} · {e.sub}</p>
              </div>
              {e.borrowerId && (
                <button onClick={() => openLoan(e.borrowerId)} className="shrink-0 text-xs font-medium text-navy-600 transition-colors hover:text-navy-900 dark:text-slate-300 dark:hover:text-white">
                  Open
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </WidgetCard>
  )
}

/* ✅ Today's tasks */
function TasksWidget() {
  const { metrics, borrowers, completeTask, openLoan, go } = useApp()
  return (
    <WidgetCard icon={ListChecks} title="Today’s tasks" sub={`${metrics.todays.length} due or overdue`} onOpen={() => go('tasks')} openLabel="Board" pad={false}>
      {metrics.todays.length === 0 ? (
        <EmptyState icon={CheckCircle2} title="All caught up" sub="Nothing due today." />
      ) : (
        <ul className="divide-y divide-slate-100 px-4 dark:divide-white/[0.06]">
          {metrics.todays.slice(0, 6).map((t) => {
            const b = borrowers.find((x) => x.id === t.borrowerId)
            const overdue = daysUntil(t.due) < 0
            return (
              <li key={t.id} className="-mx-2 flex items-center gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-slate-50/70 dark:hover:bg-white/5">
                <button
                  onClick={() => completeTask(t.id)}
                  title="Mark complete"
                  aria-label={`Mark "${t.title}" complete`}
                  className="grid h-5 w-5 shrink-0 place-items-center rounded-full border-[1.5px] border-slate-300 text-transparent transition-colors hover:border-sage-600 hover:bg-sage-50 hover:text-sage-600 dark:border-white/20"
                >
                  <Check className="h-3 w-3" strokeWidth={3} />
                </button>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] text-slate-700 dark:text-slate-200">{t.title}</p>
                  {b && (
                    <button onClick={() => openLoan(b.id)} className="text-xs text-slate-400 transition-colors hover:text-navy-700 dark:hover:text-white">
                      {b.name}
                    </button>
                  )}
                </div>
                <span className={cx('shrink-0 text-xs tabular-nums', overdue ? 'font-medium text-rose-600' : 'text-slate-400')}>{relDate(t.due)}</span>
              </li>
            )
          })}
        </ul>
      )}
    </WidgetCard>
  )
}

/* ⚠️ Needs attention */
function NeedsAttentionWidget() {
  const { metrics, openLoan, goBorrowers } = useApp()
  const none = metrics.overdue.length === 0 && metrics.stuck.length === 0
  return (
    <WidgetCard icon={AlarmClock} title="Needs attention" sub="Overdue & stuck files" onOpen={() => goBorrowers({ overdue: true })} pad={false}>
      {none ? (
        <EmptyState icon={CheckCircle2} title="Nothing slipping" sub="Every file is moving along." />
      ) : (
        <ul className="divide-y divide-slate-100 px-4 dark:divide-white/[0.06]">
          {metrics.overdue.slice(0, 5).map((b) => (
            <li key={b.id} className="flex items-center gap-3 py-2.5">
              <AlarmClock className="h-4 w-4 shrink-0 text-rose-500" strokeWidth={1.75} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-medium text-slate-700 dark:text-slate-200">{b.name}</p>
                <p className="text-xs text-slate-400">Follow-up {-daysUntil(b.nextFollowUp)}d overdue · {b.status}</p>
              </div>
              <button onClick={() => openLoan(b.id)} className="shrink-0 text-xs font-medium text-navy-600 transition-colors hover:text-navy-900 dark:text-slate-300 dark:hover:text-white">Open</button>
            </li>
          ))}
          {metrics.stuck
            .filter((b) => !metrics.overdue.includes(b))
            .slice(0, 3)
            .map((b) => (
              <li key={b.id} className="flex items-center gap-3 py-2.5">
                <Hourglass className="h-4 w-4 shrink-0 text-amber-500" strokeWidth={1.75} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-medium text-slate-700 dark:text-slate-200">{b.name}</p>
                  <p className="text-xs text-slate-400">{daysInStage(b)} days in {b.status}</p>
                </div>
                <button onClick={() => openLoan(b.id)} className="shrink-0 text-xs font-medium text-navy-600 transition-colors hover:text-navy-900 dark:text-slate-300 dark:hover:text-white">Open</button>
              </li>
            ))}
        </ul>
      )}
    </WidgetCard>
  )
}

/* 🔑 Closing soon */
function ClosingsWidget() {
  const { borrowers, seat, openLoan, go } = useApp()
  const mine = scopeBorrowers(borrowers, seat)
  const closings = mine
    .filter((b) => b.estClosing && !isClosedOut(b) && daysUntil(b.estClosing) >= 0 && daysUntil(b.estClosing) <= 30)
    .sort((a, z) => (a.estClosing < z.estClosing ? -1 : 1))
  return (
    <WidgetCard icon={KeyRound} title="Closing soon" sub="Next 30 days" onOpen={() => go('calendar')} openLabel="Calendar" pad={false}>
      {closings.length === 0 ? (
        <EmptyState icon={KeyRound} title="No closings scheduled" sub="Files near the finish line land here." />
      ) : (
        <ul className="divide-y divide-slate-100 px-4 dark:divide-white/[0.06]">
          {closings.slice(0, 6).map((b) => (
            <li key={b.id} className="flex items-center gap-3 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-medium text-slate-700 dark:text-slate-200">{b.name}</p>
                <p className="truncate text-xs text-slate-400">{money(b.amount)} · {fmtDate(b.estClosing)}</p>
              </div>
              <span className="shrink-0 rounded bg-sage-50 px-1.5 py-0.5 text-[11px] font-semibold text-sage-700 ring-1 ring-inset ring-sage-600/20 tabular-nums dark:bg-sage-500/15">
                {relDate(b.estClosing)}
              </span>
              <button onClick={() => openLoan(b.id)} className="shrink-0 text-xs font-medium text-navy-600 transition-colors hover:text-navy-900 dark:text-slate-300 dark:hover:text-white">Open</button>
            </li>
          ))}
        </ul>
      )}
    </WidgetCard>
  )
}

/* 📊 Pipeline by stage */
function PipelineWidget() {
  const { borrowers, seat, goBorrowers } = useApp()
  const mine = scopeBorrowers(borrowers, seat)
  const data = ACTIVE_STATUSES.map((s) => ({ label: s, count: mine.filter((b) => b.status === s).length, color: STATUS_STYLES[s].bar }))
  return (
    <WidgetCard icon={BarChart3} title="Pipeline by stage" sub="Tap a stage to filter" onOpen={() => goBorrowers()}>
      <PipelineBars data={data} onPick={(s) => goBorrowers({ status: s })} />
    </WidgetCard>
  )
}

/* 🤝 Agent partners */
function PartnersWidget() {
  const { borrowers, go } = useApp()
  const pulse = AGENTS.map((a) => ({ a, active: agentDeals(borrowers, a.id).filter((b) => !isClosedOut(b)).length })).sort((x, z) => z.active - x.active)
  return (
    <WidgetCard icon={Building2} title="Agent partners" sub="Your referral network" onOpen={() => go('partners')} openLabel="Partners">
      <div className="space-y-2">
        {pulse.map(({ a, active }) => (
          <button
            key={a.id}
            onClick={() => go('partners')}
            className="flex w-full items-center gap-2.5 rounded-lg border border-slate-200/80 p-2 text-left transition-colors hover:border-navy-300/70 hover:bg-slate-50/60 dark:border-white/10 dark:hover:bg-white/5"
          >
            <span className={cx('grid h-8 w-8 shrink-0 place-items-center rounded-full text-[11px] font-semibold text-white', a.color)}>{a.initials}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-medium text-navy-950 dark:text-white">{a.name}</span>
              <span className="block truncate text-[11px] text-slate-400">{a.brokerage}</span>
            </span>
            <span className="shrink-0 rounded-md bg-navy-50 px-1.5 py-0.5 text-[11px] font-semibold text-navy-700 tabular-nums dark:bg-white/10 dark:text-white">{active}</span>
          </button>
        ))}
      </div>
    </WidgetCard>
  )
}

/* 🕒 Recent activity */
function ActivityWidget() {
  const { metrics, openLoan, goBorrowers } = useApp()
  return (
    <WidgetCard icon={Activity} title="Recent activity" sub="Across your loan files" onOpen={() => goBorrowers()} openLabel="Pipeline" pad={false}>
      {metrics.activity.length === 0 ? (
        <EmptyState icon={Activity} title="No activity yet" sub="Updates will appear here." />
      ) : (
        <ul className="divide-y divide-slate-100 px-4 dark:divide-white/[0.06]">
          {metrics.activity.slice(0, 6).map((e, i) => (
            <li key={i} className="py-2.5">
              <p className="truncate text-[13px] text-slate-700 dark:text-slate-200">{e.text}</p>
              <button onClick={() => openLoan(e.borrowerId)} className="text-xs text-slate-400 transition-colors hover:text-navy-700 dark:hover:text-white">
                {e.borrower} · {relDate(e.date)}
              </button>
            </li>
          ))}
        </ul>
      )}
    </WidgetCard>
  )
}

/* 🔢 Pipeline snapshot (KPIs) */
function KpisWidget() {
  const { metrics, goBorrowers } = useApp()
  return (
    <WidgetCard icon={TrendingUp} title="Pipeline snapshot" sub="Your numbers at a glance" onOpen={() => goBorrowers()}>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-6">
        <Stat icon={UserPlus} label="New this week" value={metrics.newThisWeek.length} accent="sky" onClick={() => goBorrowers({ status: 'New Lead' })} />
        <Stat icon={FolderOpen} label="Active files" value={metrics.active.length} accent="navy" onClick={() => goBorrowers()} />
        <Stat icon={FileWarning} label="Waiting on docs" value={metrics.waitingDocs.length} accent="amber" onClick={() => goBorrowers({ status: 'Documents Needed' })} />
        <Stat icon={Landmark} label="Underwriting" value={metrics.underwriting.length} accent="violet" onClick={() => goBorrowers({ status: 'Underwriting' })} />
        <Stat icon={KeyRound} label="Ready to close" value={metrics.readyToClose.length} accent="sage" onClick={() => goBorrowers({ status: 'Clear to Close' })} />
        <Stat icon={AlarmClock} label="Overdue" value={metrics.overdue.length} accent="rose" onClick={() => goBorrowers({ overdue: true })} />
      </div>
    </WidgetCard>
  )
}

/* 🥧 Lead sources */
function LeadSourcesWidget() {
  const { borrowers, seat, go } = useApp()
  const mine = scopeBorrowers(borrowers, seat)
  const segments = Object.entries(mine.reduce((acc, b) => ((acc[b.source] = (acc[b.source] ?? 0) + 1), acc), {}))
    .map(([label, value]) => ({ label, value }))
    .sort((a, z) => z.value - a.value)
  return (
    <WidgetCard icon={PieChart} title="Lead sources" sub="Where your pipeline came from" onOpen={() => go('reports')} openLabel="Reports">
      {segments.length === 0 ? <EmptyState icon={PieChart} title="No leads yet" /> : <Donut segments={segments} />}
    </WidgetCard>
  )
}

/* 📈 New leads trend */
function LeadsTrendWidget() {
  const { go } = useApp()
  const thisWeek = WEEKLY_LEADS[WEEKLY_LEADS.length - 1]
  const lastWeek = WEEKLY_LEADS[WEEKLY_LEADS.length - 2]
  const delta = Math.round(((thisWeek - lastWeek) / lastWeek) * 100)
  return (
    <WidgetCard icon={TrendingUp} title="New leads" sub="Last 8 weeks" onOpen={() => go('reports')} openLabel="Reports">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-2xl font-semibold tracking-tight text-navy-950 tabular-nums dark:text-white">{thisWeek}</p>
          <p className="text-xs text-slate-400">this week</p>
        </div>
        <p className={cx('text-xs font-medium tabular-nums', delta >= 0 ? 'text-sage-700' : 'text-rose-600')}>
          {delta >= 0 ? '+' : ''}{delta}% vs last week
        </p>
      </div>
      <Sparkline values={WEEKLY_LEADS} className="mt-3 h-16 w-full" />
    </WidgetCard>
  )
}

/* 🗂️ Job board — files per lane */
function BoardWidget() {
  const { borrowers, boards, seat, go } = useApp()
  const mine = scopeBorrowers(borrowers, seat)
  const counts = {}
  mine.forEach((b) => {
    const lane = boards[b.id] ?? defaultBoardFor(b)
    counts[lane] = (counts[lane] ?? 0) + 1
  })
  const lanes = [...BOARD_COLUMNS, UNACTIVE_COLUMN]
  return (
    <WidgetCard icon={LayoutGrid} title="Job board" sub="Your files by lane" onOpen={() => go('borrowers')} openLabel="Open board">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {lanes.map((col) => (
          <button
            key={col.id}
            onClick={() => go('borrowers')}
            className="flex flex-col items-start rounded-lg border border-slate-200/80 p-2.5 text-left transition-colors hover:border-navy-300/70 hover:bg-slate-50/60 dark:border-white/10 dark:hover:bg-white/5"
          >
            <span className="flex items-center gap-1.5">
              <span className={cx('h-2 w-2 shrink-0 rounded-full', col.dot)} />
              <span className="truncate text-[11px] font-medium text-slate-500 dark:text-slate-400">{col.label}</span>
            </span>
            <span className="mt-1 text-xl font-semibold text-navy-950 tabular-nums dark:text-white">{counts[col.id] ?? 0}</span>
          </button>
        ))}
      </div>
    </WidgetCard>
  )
}

/* 📨 Inbox — recent borrower messages */
function InboxWidget() {
  const { borrowers, messages, seat, go } = useApp()
  const mine = scopeBorrowers(borrowers, seat)
  const totalUnread = mine.reduce((n, b) => n + (messages[b.id] ?? []).filter((m) => m.dir === 'in' && !m.read).length, 0)
  const threads = mine
    .map((b) => {
      const thread = messages[b.id] ?? []
      return { b, unread: thread.filter((m) => m.dir === 'in' && !m.read).length, last: thread[thread.length - 1] }
    })
    .filter((x) => x.last)
    .sort((a, z) => z.unread - a.unread || ((z.last?.at ?? '') < (a.last?.at ?? '') ? -1 : 1))
    .slice(0, 5)
  return (
    <WidgetCard icon={InboxIcon} title="Inbox" sub={totalUnread ? `${totalUnread} unread` : 'All caught up'} onOpen={() => go('inbox')} openLabel="Open">
      {threads.length === 0 ? (
        <EmptyState icon={MessageSquare} title="No messages yet" sub="Borrower replies will show up here." />
      ) : (
        <div className="space-y-1.5">
          {threads.map(({ b, unread, last }) => (
            <button
              key={b.id}
              onClick={() => go('inbox')}
              className="flex w-full items-center gap-2.5 rounded-lg border border-slate-200/80 p-2 text-left transition-colors hover:border-navy-300/70 hover:bg-slate-50/60 dark:border-white/10 dark:hover:bg-white/5"
            >
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5">
                  <span className="truncate text-[13px] font-medium text-navy-950 dark:text-white">{b.name}</span>
                  {unread > 0 && <span className="grid h-4 min-w-4 shrink-0 place-items-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white tabular-nums">{unread}</span>}
                </span>
                <span className="block truncate text-[11px] text-slate-400">{last.dir === 'out' ? 'You: ' : ''}{last.body}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </WidgetCard>
  )
}

/* 📝 Templates — quick access to the email library */
function TemplatesWidget() {
  const { templates, go } = useApp()
  return (
    <WidgetCard icon={FileText} title="Templates" sub={`${templates.length} ready to send`} onOpen={() => go('templates')} openLabel="Open">
      {templates.length === 0 ? (
        <EmptyState icon={FileText} title="No templates yet" sub="Create one to reuse your best emails." />
      ) : (
        <div className="space-y-1.5">
          {templates.slice(0, 5).map((t) => (
            <button
              key={t.id}
              onClick={() => go('templates')}
              className="flex w-full items-center gap-2.5 rounded-lg border border-slate-200/80 p-2 text-left transition-colors hover:border-navy-300/70 hover:bg-slate-50/60 dark:border-white/10 dark:hover:bg-white/5"
            >
              <FileText className="h-4 w-4 shrink-0 text-navy-500 dark:text-slate-300" strokeWidth={1.75} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-medium text-navy-950 dark:text-white">{t.name}</span>
                {t.subject && <span className="block truncate text-[11px] text-slate-400">{t.subject}</span>}
              </span>
            </button>
          ))}
        </div>
      )}
    </WidgetCard>
  )
}

/* 📥 Import & migrate — quick start */
function ImportWidget() {
  const { borrowers, go } = useApp()
  const actions = [
    { label: 'Import clients from a CSV', icon: Upload },
    { label: 'Add photos to your library', icon: ImageIcon },
    { label: 'Add documents', icon: FileText },
  ]
  return (
    <WidgetCard icon={Upload} title="Import & migrate" sub={`${borrowers.length} clients in your workspace`} onOpen={() => go('import')} openLabel="Open">
      <div className="space-y-2">
        {actions.map((a) => (
          <button
            key={a.label}
            onClick={() => go('import')}
            className="flex w-full items-center gap-2.5 rounded-lg border border-slate-200/80 p-2.5 text-left transition-colors hover:border-navy-300/70 hover:bg-slate-50/60 dark:border-white/10 dark:hover:bg-white/5"
          >
            <a.icon className="h-4 w-4 shrink-0 text-navy-500 dark:text-slate-300" strokeWidth={1.75} />
            <span className="flex-1 text-[13px] font-medium text-navy-950 dark:text-white">{a.label}</span>
            <ArrowRight className="h-3.5 w-3.5 shrink-0 text-slate-300" />
          </button>
        ))}
      </div>
    </WidgetCard>
  )
}

/* ---------- registry ---------- */
export const WIDGETS = [
  { id: 'agenda', name: 'Today’s calendar', icon: CalendarDays, size: 'half', Component: AgendaWidget },
  { id: 'tasks', name: 'Today’s tasks', icon: ListChecks, size: 'half', Component: TasksWidget },
  { id: 'openLoans', name: 'Open loans', icon: FolderOpen, size: 'full', Component: OpenLoansWidget },
  { id: 'needsAttention', name: 'Needs attention', icon: AlarmClock, size: 'half', Component: NeedsAttentionWidget },
  { id: 'closings', name: 'Closing soon', icon: KeyRound, size: 'half', Component: ClosingsWidget },
  { id: 'pipeline', name: 'Pipeline by stage', icon: BarChart3, size: 'half', Component: PipelineWidget },
  { id: 'partners', name: 'Agent partners', icon: Building2, size: 'half', Component: PartnersWidget },
  { id: 'activity', name: 'Recent activity', icon: Activity, size: 'half', Component: ActivityWidget },
  { id: 'kpis', name: 'Pipeline snapshot (KPIs)', icon: TrendingUp, size: 'full', Component: KpisWidget },
  { id: 'leadSources', name: 'Lead sources', icon: PieChart, size: 'half', Component: LeadSourcesWidget },
  { id: 'leadsTrend', name: 'New leads trend', icon: TrendingUp, size: 'half', Component: LeadsTrendWidget },
  { id: 'board', name: 'Job board', icon: LayoutGrid, size: 'half', Component: BoardWidget },
  { id: 'inbox', name: 'Inbox', icon: InboxIcon, size: 'half', Component: InboxWidget },
  { id: 'templates', name: 'Templates', icon: FileText, size: 'half', Component: TemplatesWidget },
  { id: 'import', name: 'Import & migrate', icon: Upload, size: 'half', Component: ImportWidget },
]

export const WIDGET_BY_ID = Object.fromEntries(WIDGETS.map((w) => [w.id, w]))

/* default layout — centered on daily calendar, tasks, and open loans */
export const DEFAULT_VISIBLE = ['agenda', 'tasks', 'openLoans', 'needsAttention', 'closings', 'pipeline', 'partners', 'activity']
