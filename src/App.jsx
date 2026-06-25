import { useState, useEffect } from 'react'
import {
  LayoutDashboard,
  Users,
  ListChecks,
  Inbox as InboxIcon,
  BarChart3,
  CalendarDays,
  Building2,
  Briefcase,
  HeartHandshake,
  ClipboardList,
  UserCircle,
  Plug,
  Settings as SettingsIcon,
  Menu,
  X,
  Bell,
  Search,
  CornerDownLeft,
  Plus,
  Check,
  CheckCircle2,
  ChevronsUpDown,
  AlarmClock,
  Sparkles,
  Lock,
  Sun,
  Moon,
  LogOut,
  MessageSquare,
  Mail,
  Upload,
} from 'lucide-react'
import { AppProvider, useApp } from './store.jsx'
import { OFFICERS, LOAN_TYPES, SOURCES, INTEGRATIONS, agentById, daysUntil, rateLockStatus, timeOfDay, SKY, DISCLAIMER } from './data.js'
import { buildSuggestions } from './autopilot.js'
import { BrandMark, Btn, Modal, Field, Select, SearchInput, PoweredBySolvyr, inputCls, cx } from './ui.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Autopilot from './pages/Autopilot.jsx'
import Borrowers from './pages/Borrowers.jsx'
import LoanFile from './pages/LoanFile.jsx'
import Tasks from './pages/Tasks.jsx'
import Portal from './pages/Portal.jsx'
import Apply from './pages/Apply.jsx'
import Inbox from './pages/Inbox.jsx'
import LiveMail from './pages/LiveMail.jsx'
import Reports from './pages/Reports.jsx'
import Calendar from './pages/Calendar.jsx'
import Partners from './pages/Partners.jsx'
import Profile from './pages/Profile.jsx'
import Integrations, { INTEGRATION_ICONS } from './pages/Integrations.jsx'
import Settings from './pages/Settings.jsx'
import Import from './pages/Import.jsx'
import Landing from './pages/Landing.jsx'

const MS_CITIES = ['Brandon', 'Flowood', 'Jackson', 'Madison', 'Pearl', 'Ridgeland', 'Clinton']

const NAV_MAIN = [
  { page: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { page: 'autopilot', label: 'Autopilot', icon: Sparkles },
  { page: 'calendar', label: 'Calendar', icon: CalendarDays },
  { page: 'partners', label: 'Agent Partners', icon: Building2 },
  { page: 'borrowers', label: 'Borrowers', icon: Users },
  { page: 'inbox', label: 'Inbox', icon: InboxIcon },
  { page: 'livemail', label: 'Live Mail', icon: Mail },
  { page: 'tasks', label: 'Tasks', icon: ListChecks },
  { page: 'reports', label: 'Reports', icon: BarChart3 },
]
const NAV_CLIENT = [
  { page: 'portal', label: 'Borrower Portal', icon: HeartHandshake },
  { page: 'apply', label: 'Inquire', icon: ClipboardList },
]
const NAV_SYSTEM = [
  { page: 'import', label: 'Import & migrate', icon: Upload },
  { page: 'settings', label: 'Settings', icon: SettingsIcon },
]

/* ---------------- new lead modal ---------------- */
function NewLeadModal({ open, onClose }) {
  const { addBorrower, seat } = useApp()
  const blank = {
    name: '',
    phone: '',
    email: '',
    loanType: 'Conventional',
    purpose: 'Purchase',
    amount: '',
    city: 'Madison',
    source: 'Realtor Referral',
    officerId: seat === 'team' ? 'michelle' : seat,
  }
  const [form, setForm] = useState(blank)
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }))

  const submit = (e) => {
    e.preventDefault()
    if (!form.name.trim()) return
    addBorrower({ ...form, name: form.name.trim() })
    setForm(blank)
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title="Add a new lead" sub="30 seconds now beats a lost sticky note later." wide>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Full name *">
            <input
              autoFocus
              required
              className={inputCls}
              placeholder="e.g. Monica Hayes"
              value={form.name}
              onChange={(e) => set('name')(e.target.value)}
            />
          </Field>
          <Field label="Phone">
            <input
              className={inputCls}
              placeholder="(601) 555-0123"
              value={form.phone}
              onChange={(e) => set('phone')(e.target.value)}
            />
          </Field>
          <Field label="Email" className="sm:col-span-2">
            <input
              type="email"
              className={inputCls}
              placeholder="name@email.com"
              value={form.email}
              onChange={(e) => set('email')(e.target.value)}
            />
          </Field>
          <Field label="Loan type">
            <Select value={form.loanType} onChange={set('loanType')} options={LOAN_TYPES} />
          </Field>
          <Field label="Purpose">
            <Select value={form.purpose} onChange={set('purpose')} options={['Purchase', 'Refinance', 'Cash-Out Refinance']} />
          </Field>
          <Field label="Desired loan amount">
            <input
              type="number"
              min="0"
              step="1000"
              className={inputCls}
              placeholder="250000"
              value={form.amount}
              onChange={(e) => set('amount')(e.target.value)}
            />
          </Field>
          <Field label="Property city">
            <Select value={form.city} onChange={set('city')} options={MS_CITIES} />
          </Field>
          <Field label="Lead source">
            <Select value={form.source} onChange={set('source')} options={SOURCES} />
          </Field>
          <Field label="Assigned loan officer">
            <Select
              value={form.officerId}
              onChange={set('officerId')}
              options={OFFICERS.map((o) => ({ value: o.id, label: o.name }))}
            />
          </Field>
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
          <Btn type="submit">
            <Plus className="h-3.5 w-3.5" /> Add lead
          </Btn>
        </div>
      </form>
    </Modal>
  )
}

/* ---------------- sidebar ---------------- */
function NavItem({ page, label, icon: Icon, active, onGo, badge }) {
  return (
    <button
      onClick={() => onGo(page)}
      className={cx(
        'flex h-8 w-full items-center gap-2.5 rounded-lg px-2.5 text-[13px] transition-colors',
        active
          ? 'bg-white/[0.08] font-medium text-white'
          : 'text-navy-300 hover:bg-white/[0.04] hover:text-white',
      )}
    >
      <Icon className="h-4 w-4" strokeWidth={1.75} />
      {label}
      {badge > 0 && (
        <span className="ml-auto grid h-4 min-w-4 place-items-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white tabular-nums">
          {badge}
        </span>
      )}
    </button>
  )
}

/* compact connected-integration shortcut in the sidebar */
function IntegrationNavItem({ integration, onGo }) {
  const Icon = INTEGRATION_ICONS[integration.icon] ?? Plug
  return (
    <button
      onClick={() => onGo('integrations')}
      title={`${integration.name} · connected`}
      className="flex h-8 w-full items-center gap-2.5 rounded-lg px-2.5 text-[13px] text-navy-300 transition-colors hover:bg-white/[0.04] hover:text-white"
    >
      <span className="grid h-5 w-5 shrink-0 place-items-center rounded-md bg-white/10">
        <Icon className="h-3 w-3" style={{ color: integration.color }} strokeWidth={2.25} />
      </span>
      <span className="truncate">{integration.name}</span>
      <span className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-sage-400" />
    </button>
  )
}

/* ---------------- seat switcher (whole team ↔ one officer) ---------------- */
function SeatSwitcher() {
  const { seat, setSeat, go, signOut } = useApp()
  const [open, setOpen] = useState(false)
  const current = seat === 'team' ? null : OFFICERS.find((o) => o.id === seat)
  const pick = (id) => {
    setSeat(id)
    setOpen(false)
  }

  return (
    <div className="relative">
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute bottom-full left-0 z-20 mb-2 w-full overflow-hidden rounded-xl border border-white/10 bg-navy-900 p-1 shadow-[0_16px_44px_-8px_rgba(0,0,0,0.6)]">
            <p className="px-2.5 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-navy-500">
              Viewing as
            </p>
            <button
              onClick={() => pick('team')}
              className={cx(
                'flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-white/[0.06]',
                seat === 'team' && 'bg-white/[0.04]',
              )}
            >
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white/10">
                <Users className="h-3.5 w-3.5 text-navy-200" strokeWidth={2} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-medium text-white">Whole team</span>
                <span className="block truncate text-[10px] text-navy-400">Everyone’s pipeline</span>
              </span>
              {seat === 'team' && <Check className="h-4 w-4 shrink-0 text-sage-400" />}
            </button>
            {OFFICERS.map((o) => (
              <button
                key={o.id}
                onClick={() => pick(o.id)}
                className={cx(
                  'flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-white/[0.06]',
                  seat === o.id && 'bg-white/[0.04]',
                )}
              >
                <span className={cx('grid h-7 w-7 shrink-0 place-items-center rounded-full text-[10px] font-semibold text-white', o.color)}>
                  {o.initials}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-medium text-white">{o.name}</span>
                  <span className="block truncate text-[10px] text-navy-400">{o.role}</span>
                </span>
                {seat === o.id && <Check className="h-4 w-4 shrink-0 text-sage-400" />}
              </button>
            ))}
            <div className="my-1 border-t border-white/[0.08]" />
            <button
              onClick={() => {
                go('profile', {})
                setOpen(false)
              }}
              className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-white/[0.06]"
            >
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white/10">
                <UserCircle className="h-3.5 w-3.5 text-navy-200" strokeWidth={2} />
              </span>
              <span className="block flex-1 truncate text-xs font-medium text-white">
                {seat === 'team' ? 'View the team' : 'View my profile'}
              </span>
            </button>
            <button
              onClick={() => {
                setOpen(false)
                signOut()
              }}
              className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-white/[0.06]"
            >
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white/10">
                <LogOut className="h-3.5 w-3.5 text-navy-200" strokeWidth={2} />
              </span>
              <span className="block flex-1 truncate text-xs font-medium text-white">Sign out</span>
            </button>
          </div>
        </>
      )}

      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2.5 rounded-lg px-1.5 py-1.5 transition-colors hover:bg-white/[0.04]"
      >
        {current ? (
          <span className={cx('grid h-7 w-7 shrink-0 place-items-center rounded-full text-[10px] font-semibold text-white', current.color)}>
            {current.initials}
          </span>
        ) : (
          <span className="flex shrink-0 -space-x-2">
            {OFFICERS.map((o) => (
              <span
                key={o.id}
                className={cx('grid h-6 w-6 place-items-center rounded-full text-[9px] font-semibold text-white ring-2 ring-navy-950', o.color)}
              >
                {o.initials}
              </span>
            ))}
          </span>
        )}
        <span className="min-w-0 flex-1 text-left">
          <span className="block truncate text-xs font-medium text-white">
            {current ? current.name : 'MS Lending Team'}
          </span>
          <span className="block truncate text-[10px] text-navy-400">
            {current ? 'My workspace' : 'Whole team · shared'}
          </span>
        </span>
        <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-navy-400" />
      </button>
    </div>
  )
}

function Sidebar({ mobileOpen, onCloseMobile }) {
  const { view, go, connections, messages, borrowers, seat, apHandled } = useApp()
  const activePage = view.page === 'loan' ? 'borrowers' : view.page
  const connectedIntegrations = INTEGRATIONS.filter((it) => connections[it.id])
  const inboxUnread = borrowers
    .filter((b) => seat === 'team' || b.officerId === seat)
    .reduce((n, b) => n + (messages[b.id] ?? []).filter((m) => m.dir === 'in' && !m.read).length, 0)
  const autopilotCount = buildSuggestions(borrowers, seat, apHandled).length
  const onGo = (page) => {
    go(page)
    onCloseMobile()
  }

  const nav = (
    <div className="relative isolate flex h-full flex-col">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-44"
        style={{ background: `radial-gradient(125% 70% at 50% 0%, ${SKY[timeOfDay()].accent}, transparent 72%)` }}
      />
      <div className="flex items-center gap-2.5 px-4 pb-5 pt-5">
        <BrandMark className="h-8 w-8" />
        <div className="min-w-0">
          <p className="text-[13px] font-semibold leading-4 text-white">MS Lending</p>
          <p className="text-[11px] leading-4 text-navy-400">Loan Workspace</p>
        </div>
      </div>

      <nav className="flex-1 space-y-0.5 px-3">
        {NAV_MAIN.map((item) => (
          <NavItem
            key={item.page}
            {...item}
            active={activePage === item.page}
            onGo={onGo}
            badge={item.page === 'inbox' ? inboxUnread : item.page === 'autopilot' ? autopilotCount : undefined}
          />
        ))}
        <p className="px-2.5 pb-1 pt-5 text-[10px] font-semibold uppercase tracking-wider text-navy-500">
          Client view
        </p>
        {NAV_CLIENT.map((item) => (
          <NavItem key={item.page} {...item} active={activePage === item.page} onGo={onGo} />
        ))}

        <div className="flex items-center justify-between px-2.5 pb-1 pt-5">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-navy-500">
            Integrations
          </span>
          {connectedIntegrations.length > 0 && (
            <span className="rounded-full bg-white/[0.06] px-1.5 text-[10px] font-semibold text-navy-300 tabular-nums">
              {connectedIntegrations.length}
            </span>
          )}
        </div>
        {connectedIntegrations.map((it) => (
          <IntegrationNavItem key={it.id} integration={it} onGo={onGo} />
        ))}
        <NavItem
          page="integrations"
          label={connectedIntegrations.length ? 'Add integration' : 'Connect your tools'}
          icon={Plug}
          active={activePage === 'integrations'}
          onGo={onGo}
        />
      </nav>

      <div className="space-y-3 px-3 pb-4">
        {NAV_SYSTEM.map((item) => (
          <NavItem key={item.page} {...item} active={activePage === item.page} onGo={onGo} />
        ))}
        <div className="border-t border-white/[0.08] pt-2">
          <SeatSwitcher />
          <p className="mt-2 px-1 text-[10px] leading-relaxed text-navy-500">{DISCLAIMER}</p>
        </div>
      </div>
    </div>
  )

  return (
    <>
      {/* desktop */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 border-r border-white/[0.06] bg-navy-950 lg:block">
        {nav}
      </aside>
      {/* mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="animate-fadein absolute inset-0 bg-navy-950/45" onClick={onCloseMobile} />
          <aside className="animate-slidein absolute inset-y-0 left-0 w-68 max-w-[80vw] bg-navy-950 shadow-2xl">
            <button
              onClick={onCloseMobile}
              className="absolute right-3 top-4 rounded-md p-1.5 text-navy-300 transition-colors hover:bg-white/10 hover:text-white"
            >
              <X className="h-4.5 w-4.5" />
            </button>
            {nav}
          </aside>
        </div>
      )}
    </>
  )
}

/* ---------------- theme toggle ---------------- */
function ThemeToggle() {
  const { theme, toggleTheme } = useApp()
  const dark = theme === 'dark'
  return (
    <button
      onClick={toggleTheme}
      className="rounded-lg p-2 text-navy-200 transition-colors hover:bg-white/10 hover:text-white"
      aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={dark ? 'Light mode' : 'Dark mode'}
    >
      {dark ? <Sun className="h-4 w-4" strokeWidth={1.75} /> : <Moon className="h-4 w-4" strokeWidth={1.75} />}
    </button>
  )
}

/* ---------------- ⌘K command palette ---------------- */
const PALETTE_PAGES = [
  ['dashboard', 'Dashboard'],
  ['autopilot', 'Autopilot'],
  ['calendar', 'Calendar'],
  ['partners', 'Agent Partners'],
  ['borrowers', 'Borrowers'],
  ['inbox', 'Inbox'],
  ['livemail', 'Live Mail'],
  ['tasks', 'Tasks'],
  ['reports', 'Reports'],
  ['apply', 'Inquire'],
  ['portal', 'Borrower Portal'],
  ['integrations', 'Integrations'],
  ['import', 'Import & migrate'],
  ['profile', 'My Profile'],
  ['settings', 'Settings'],
]

function CommandPalette({ open, onClose }) {
  const { borrowers, tasks, openLoan, go } = useApp()
  const [q, setQ] = useState('')
  const [active, setActive] = useState(0)

  useEffect(() => {
    if (open) {
      setQ('')
      setActive(0)
    }
  }, [open])

  if (!open) return null

  const query = q.trim().toLowerCase()
  const borrowerItems = (query
    ? borrowers.filter((b) => `${b.name} ${b.coBorrower ?? ''} ${b.phone} ${b.email} ${b.city}`.toLowerCase().includes(query))
    : borrowers
  )
    .slice(0, 6)
    .map((b) => ({ kind: 'Borrower', label: b.name, sub: `${b.status} · ${b.city}`, onSelect: () => openLoan(b.id) }))
  const taskItems = (query ? tasks.filter((t) => t.title.toLowerCase().includes(query)) : [])
    .slice(0, 5)
    .map((t) => ({ kind: 'Task', label: t.title, sub: 'Open the task board', onSelect: () => go('tasks') }))
  const pageItems = PALETTE_PAGES.filter(([, l]) => !query || l.toLowerCase().includes(query)).map(([p, l]) => ({
    kind: 'Go to',
    label: l,
    onSelect: () => go(p),
  }))
  const items = [...borrowerItems, ...taskItems, ...pageItems]
  const clampedActive = Math.min(active, Math.max(0, items.length - 1))

  const pick = (i) => {
    const it = items[i]
    if (it) {
      it.onSelect()
      onClose()
    }
  }

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((i) => Math.min(i + 1, items.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      pick(clampedActive)
    } else if (e.key === 'Escape') {
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 z-[70] px-4 pt-[12vh]">
      <div className="animate-fadein fixed inset-0 bg-navy-950/40" onClick={onClose} />
      <div className="animate-modalin relative mx-auto w-full max-w-xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_24px_60px_-12px_rgba(16,24,40,0.35)] dark:border-white/10 dark:bg-navy-900">
        <div className="flex items-center gap-2.5 border-b border-slate-100 px-4 dark:border-white/10">
          <Search className="h-4 w-4 shrink-0 text-slate-400" />
          <input
            autoFocus
            value={q}
            onChange={(e) => {
              setQ(e.target.value)
              setActive(0)
            }}
            onKeyDown={onKeyDown}
            placeholder="Search borrowers, tasks, pages…"
            className="h-12 w-full bg-transparent text-[14px] text-slate-700 placeholder:text-slate-400 focus:outline-none dark:text-slate-200"
          />
          <kbd className="hidden rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-medium text-slate-400 sm:block dark:border-white/10 dark:bg-white/5">
            Esc
          </kbd>
        </div>
        {items.length === 0 ? (
          <p className="px-4 py-8 text-center text-[13px] text-slate-400">No matches for “{q}”.</p>
        ) : (
          <ul className="max-h-80 overflow-y-auto p-1.5">
            {items.map((it, i) => (
              <li key={i}>
                <button
                  onMouseEnter={() => setActive(i)}
                  onClick={() => pick(i)}
                  className={cx(
                    'flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-colors',
                    i === clampedActive ? 'bg-navy-50 dark:bg-white/[0.06]' : 'hover:bg-slate-50 dark:hover:bg-white/5',
                  )}
                >
                  <span className="w-16 shrink-0 text-[10px] font-semibold uppercase tracking-wide text-slate-400">{it.kind}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-medium text-navy-950 dark:text-white">{it.label}</span>
                    {it.sub && <span className="block truncate text-xs text-slate-400">{it.sub}</span>}
                  </span>
                  {i === clampedActive && <CornerDownLeft className="h-3.5 w-3.5 shrink-0 text-slate-400" />}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

/* ---------------- notification bell ---------------- */
function NotificationBell() {
  const { metrics, borrowers, messages, seat, notifPrefs, openLoan, go } = useApp()
  const [open, setOpen] = useState(false)

  const mine = seat === 'team' ? borrowers : borrowers.filter((b) => b.officerId === seat)
  const applyLeads = mine.filter((b) => b.viaApply && b.status === 'New Lead')
  const referralLeads = mine.filter((b) => b.viaReferral && b.status === 'New Lead')
  const unreadMsgs = mine
    .map((b) => ({ b, unread: (messages[b.id] ?? []).filter((m) => m.dir === 'in' && !m.read).length }))
    .filter((x) => x.unread > 0)

  const items = [
    ...unreadMsgs.map(({ b, unread }) => ({
      key: 'm' + b.id,
      icon: MessageSquare,
      tone: 'bg-sky-50 text-sky-600',
      text: `New message${unread > 1 ? `s (${unread})` : ''} from ${b.name}`,
      sub: 'Open the inbox',
      onClick: () => go('inbox'),
    })),
    ...(notifPrefs.applyLeads
      ? referralLeads.map((b) => ({
          key: 'r' + b.id,
          icon: Building2,
          tone: 'bg-rose-50 text-rose-600',
          text: `Referral from ${agentById(b.agentId)?.name ?? 'an agent partner'}`,
          sub: b.name,
          onClick: () => openLoan(b.id),
        }))
      : []),
    ...(notifPrefs.applyLeads
      ? applyLeads.map((b) => ({
          key: 'a' + b.id,
          icon: Sparkles,
          tone: 'bg-sage-50 text-sage-600',
          text: 'New lead via your apply link',
          sub: b.name,
          onClick: () => openLoan(b.id),
        }))
      : []),
    ...(notifPrefs.overdue
      ? metrics.overdue.map((b) => ({
          key: 'o' + b.id,
          icon: AlarmClock,
          tone: 'bg-rose-50 text-rose-600',
          text: 'Follow-up overdue',
          sub: `${b.name} · ${-daysUntil(b.nextFollowUp)}d`,
          onClick: () => openLoan(b.id),
        }))
      : []),
    ...(notifPrefs.tasks
      ? metrics.todays.slice(0, 6).map((t) => ({
          key: 't' + t.id,
          icon: ListChecks,
          tone: 'bg-navy-50 text-navy-600',
          text: t.title,
          sub: daysUntil(t.due) < 0 ? 'Task overdue' : 'Task due today',
          onClick: () => go('tasks'),
        }))
      : []),
    ...(notifPrefs.rateLocks
      ? mine
          .map((b) => ({ b, rl: rateLockStatus(b) }))
          .filter(({ rl }) => rl && (rl.soon || rl.expired))
          .map(({ b, rl }) => ({
            key: 'r' + b.id,
            icon: Lock,
            tone: 'bg-amber-50 text-amber-600',
            text: rl.expired ? 'Rate lock expired' : 'Rate lock expiring',
            sub: `${b.name} · ${rl.label}`,
            onClick: () => openLoan(b.id),
          }))
      : []),
  ]
  const count = items.length

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative rounded-lg p-2 text-navy-200 transition-colors hover:bg-white/10 hover:text-white"
        aria-label={`Notifications${count ? ` (${count})` : ''}`}
      >
        <Bell className="h-4 w-4" strokeWidth={1.75} />
        {count > 0 && (
          <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white ring-2 ring-navy-950 tabular-nums">
            {count}
          </span>
        )}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_16px_44px_-8px_rgba(16,24,40,0.25)]">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5">
              <p className="text-[13px] font-semibold text-navy-950">Notifications</p>
              {count > 0 && <span className="text-[11px] text-slate-400 tabular-nums">{count} need attention</span>}
            </div>
            {count === 0 ? (
              <div className="grid place-items-center px-6 py-8 text-center">
                <CheckCircle2 className="mb-2 h-6 w-6 text-sage-400" strokeWidth={1.5} />
                <p className="text-[13px] font-medium text-slate-600">You’re all caught up</p>
                <p className="mt-0.5 text-xs text-slate-400">No overdue follow-ups or tasks due.</p>
              </div>
            ) : (
              <ul className="max-h-80 divide-y divide-slate-100 overflow-y-auto">
                {items.map((n) => {
                  const Icon = n.icon
                  return (
                    <li key={n.key}>
                      <button
                        onClick={() => {
                          n.onClick()
                          setOpen(false)
                        }}
                        className="flex w-full items-start gap-3 px-4 py-2.5 text-left transition-colors hover:bg-slate-50"
                      >
                        <span className={cx('mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full', n.tone)}>
                          <Icon className="h-3.5 w-3.5" strokeWidth={2} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13px] font-medium text-slate-700">{n.text}</span>
                          <span className="block truncate text-xs text-slate-400">{n.sub}</span>
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  )
}

/* ---------------- topbar ---------------- */
function Topbar({ onMenu, onNewLead, onOpenPalette }) {
  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-navy-950 transition-colors duration-300">
      <div className="mx-auto flex h-[52px] max-w-6xl items-center gap-3 px-4 sm:px-6">
        <button
          onClick={onMenu}
          className="rounded-lg p-1.5 text-navy-200 transition-colors hover:bg-white/10 lg:hidden"
        >
          <Menu className="h-4.5 w-4.5" />
        </button>
        <BrandMark className="h-7 w-7 shrink-0 lg:hidden" />
        <button
          onClick={onOpenPalette}
          className="hidden h-9 w-72 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.07] px-2.5 text-[13px] text-navy-200 transition-colors hover:border-white/25 hover:bg-white/10 sm:flex"
        >
          <Search className="h-3.5 w-3.5" />
          Search borrowers, tasks, pages…
          <kbd className="ml-auto rounded border border-white/10 bg-white/10 px-1 text-[10px] font-medium text-navy-200">
            ⌘K
          </kbd>
        </button>
        <button
          onClick={onOpenPalette}
          aria-label="Search"
          className="rounded-lg p-1.5 text-navy-200 transition-colors hover:bg-white/10 sm:hidden"
        >
          <Search className="h-4.5 w-4.5" />
        </button>
        <div className="ml-auto flex items-center gap-1.5">
          <ThemeToggle />
          <NotificationBell />
          <Btn variant="sage" onClick={onNewLead}>
            <Plus className="h-3.5 w-3.5" /> <span className="hidden sm:inline">New Lead</span>
          </Btn>
        </div>
      </div>
    </header>
  )
}

/* ---------------- closing-day confetti ---------------- */
const CONFETTI_COLORS = [
  'var(--color-sage-500)',
  'var(--color-navy-500)',
  'var(--color-sage-300)',
  '#f59e0b',
  '#38bdf8',
  '#f43f5e',
]

function Confetti() {
  const { celebrate } = useApp()
  const [burst, setBurst] = useState(null)

  useEffect(() => {
    if (!celebrate) return
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    const pieces = Array.from({ length: 44 }, (_, i) => ({
      id: `${celebrate}-${i}`,
      left: Math.random() * 100,
      delay: Math.random() * 0.5,
      dur: 1.8 + Math.random() * 1.4,
      size: 6 + Math.random() * 6,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      round: i % 3 === 0,
    }))
    setBurst(pieces)
    const t = setTimeout(() => setBurst(null), 3800)
    return () => clearTimeout(t)
  }, [celebrate])

  if (!burst) return null
  return (
    <div className="pointer-events-none fixed inset-0 z-[80] overflow-hidden" aria-hidden="true">
      {burst.map((p) => (
        <span
          key={p.id}
          className={cx('animate-confetti absolute top-0', p.round ? 'rounded-full' : 'rounded-[2px]')}
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.size * (p.round ? 1 : 0.6),
            backgroundColor: p.color,
            '--confetti-dur': `${p.dur}s`,
            '--confetti-delay': `${p.delay}s`,
          }}
        />
      ))}
    </div>
  )
}

/* ---------------- toasts ---------------- */
function Toasts() {
  const { toasts } = useApp()
  return (
    <div className="pointer-events-none fixed bottom-20 right-4 z-[60] space-y-2 sm:bottom-5 sm:right-5">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="animate-slidein flex items-center gap-2.5 rounded-lg border border-slate-200 bg-white py-2.5 pl-3 pr-4 text-[13px] font-medium text-slate-700 shadow-[0_8px_24px_-8px_rgba(16,24,40,0.18)] dark:border-white/10 dark:bg-navy-900 dark:text-slate-200"
        >
          <CheckCircle2 className="h-4 w-4 shrink-0 text-sage-600" strokeWidth={2} />
          {t.text}
        </div>
      ))}
    </div>
  )
}

/* ---------------- shell ---------------- */
/* ---------------- mobile bottom nav ---------------- */
function MobileNav({ onMenu }) {
  const { view, go } = useApp()
  const active = view.page === 'loan' ? 'borrowers' : view.page
  const items = [
    { page: 'dashboard', label: 'Home', icon: LayoutDashboard },
    { page: 'calendar', label: 'Calendar', icon: CalendarDays },
    { page: 'borrowers', label: 'Borrowers', icon: Users },
    { page: 'tasks', label: 'Tasks', icon: ListChecks },
  ]
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur-sm lg:hidden dark:border-white/10 dark:bg-navy-950/95"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="mx-auto flex max-w-md items-stretch justify-around">
        {items.map((it) => {
          const Icon = it.icon
          const isActive = active === it.page
          return (
            <button
              key={it.page}
              onClick={() => go(it.page)}
              className={cx(
                'relative flex min-h-[3.25rem] flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors',
                isActive ? 'text-navy-800 dark:text-white' : 'text-slate-400',
              )}
            >
              {isActive && <span className="absolute top-0 h-0.5 w-8 rounded-full bg-sage-500" />}
              <Icon className="h-5 w-5" strokeWidth={isActive ? 2.2 : 1.75} />
              {it.label}
            </button>
          )
        })}
        <button
          onClick={onMenu}
          className="flex min-h-[3.25rem] flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-medium text-slate-400"
        >
          <Menu className="h-5 w-5" strokeWidth={1.75} />
          More
        </button>
      </div>
    </nav>
  )
}

function Shell() {
  const { view } = useApp()
  const [menuOpen, setMenuOpen] = useState(false)
  const [leadOpen, setLeadOpen] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setPaletteOpen((o) => !o)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className="min-h-screen">
      <div className="app-aurora" aria-hidden="true" />
      <Sidebar mobileOpen={menuOpen} onCloseMobile={() => setMenuOpen(false)} />
      <div className="relative z-[1] lg:pl-60">
        <Topbar onMenu={() => setMenuOpen(true)} onNewLead={() => setLeadOpen(true)} onOpenPalette={() => setPaletteOpen(true)} />
        <main className="mx-auto max-w-6xl px-4 pb-24 pt-6 sm:px-6 lg:pb-6">
          <div key={view.page === 'loan' ? `loan-${view.id}` : view.page} className="page-enter">
            {view.page === 'dashboard' && <Dashboard />}
            {view.page === 'autopilot' && <Autopilot />}
            {view.page === 'borrowers' && <Borrowers onNewLead={() => setLeadOpen(true)} />}
            {view.page === 'loan' && <LoanFile key={view.id} id={view.id} initialTab={view.tab} />}
            {view.page === 'tasks' && <Tasks />}
            {view.page === 'inbox' && <Inbox />}
            {view.page === 'livemail' && <LiveMail />}
            {view.page === 'reports' && <Reports />}
            {view.page === 'calendar' && <Calendar />}
            {view.page === 'partners' && <Partners />}
            {view.page === 'profile' && <Profile key={view.id ?? 'me'} />}
            {view.page === 'portal' && <Portal key={view.id ?? 'default'} initialId={view.id} />}
            {view.page === 'apply' && <Apply />}
            {view.page === 'integrations' && <Integrations />}
            {view.page === 'import' && <Import />}
            {view.page === 'settings' && <Settings />}
          </div>
        </main>
        <footer className="mx-auto max-w-6xl space-y-1.5 px-4 pb-8 sm:px-6">
          <p className="border-t border-slate-200/70 pt-4 text-center text-[11px] text-slate-400 dark:border-white/10">
            A concept loan workspace for MS Lending, LLC — {DISCLAIMER}
          </p>
          <PoweredBySolvyr />
        </footer>
      </div>
      <MobileNav onMenu={() => setMenuOpen(true)} />
      <Confetti />
      <Toasts />
      <NewLeadModal open={leadOpen} onClose={() => setLeadOpen(false)} />
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </div>
  )
}

function Root() {
  const { signedIn } = useApp()
  return signedIn ? <Shell /> : <Landing />
}

export default function App() {
  return (
    <AppProvider>
      <Root />
    </AppProvider>
  )
}
