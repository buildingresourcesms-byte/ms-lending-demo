import { useState } from 'react'
import {
  ArrowLeft,
  Zap,
  Eye,
  Phone,
  Mail,
  MessageSquare,
  MapPin,
  Building2,
  AlarmClock,
  Hourglass,
  FileText,
  Send,
  Plus,
  Plug,
  ShieldCheck,
  StickyNote,
  CalendarDays,
  Check,
  Lock,
  Users,
} from 'lucide-react'
import { useApp } from '../store.jsx'
import {
  officerById,
  agentById,
  OFFICERS,
  money,
  fmtDate,
  fmtDateFull,
  relDate,
  daysUntil,
  daysInStage,
  isOverdue,
  isStuck,
  isClosedOut,
  missingDocs,
  docProgress,
  monthlyPayment,
  rateLockStatus,
  slaStatus,
  NEXT_STEP,
  DOC_STATUSES,
  DOC_STYLES,
  d,
} from '../data.js'
import {
  Card,
  Btn,
  Badge,
  StatusBadge,
  DocBadge,
  Avatar,
  ProgressBar,
  Select,
  KV,
  EmptyState,
  PriorityBadge,
  Modal,
  DropZone,
  inputCls,
  Field,
  cx,
} from '../ui.jsx'
import { Timeline } from '../events.jsx'

const TABS = ['Overview', 'Borrower Info', 'Loan Details', 'Documents', 'Tasks', 'Notes', 'Timeline']

/* stages where sending the online application still makes sense */
const APPLY_STAGES = ['New Lead', 'Contacted', 'Application Started']

const creditTier = (s) =>
  !s ? '—' : s >= 740 ? 'Excellent' : s >= 700 ? 'Very good' : s >= 660 ? 'Good' : s >= 620 ? 'Fair' : 'Needs work'

/* ---------- borrower communication channels ---------- */
const PROVIDER_NAMES = {
  dialer: 'Phone Dialer',
  sms: 'Text Messaging',
  whatsapp: 'WhatsApp',
  gmail: 'Gmail',
  outlook: 'Outlook',
}

export const CHANNELS = {
  call: { label: 'Call', icon: Phone, providers: ['dialer'], field: 'phone' },
  sms: { label: 'Text', icon: MessageSquare, providers: ['sms', 'whatsapp'], field: 'phone' },
  email: { label: 'Email', icon: Mail, providers: ['gmail', 'outlook'], field: 'email' },
}

/* which connected integration powers a channel (if any) */
export const channelProvider = (channel, connections) => {
  const id = CHANNELS[channel].providers.find((p) => connections[p])
  return id ? { id, name: PROVIDER_NAMES[id], account: connections[id].account } : null
}

const textareaCls =
  'w-full rounded-lg border border-slate-300/70 bg-white px-2.5 py-2 text-[13px] leading-relaxed text-slate-700 transition-colors placeholder:text-slate-400 hover:border-slate-400/80 focus:border-navy-500 focus:outline-none focus:ring-2 focus:ring-navy-500/15 resize-none'

const defaultBody = (channel, b, officer) => {
  const first = b.name.split(' ')[0]
  const offFirst = officer.name.split(' ')[0]
  if (channel === 'email')
    return `Hi ${first},\n\nQuick update on your ${b.loanType} loan with MS Lending — your file is currently at "${b.status}". ${NEXT_STEP[b.status]}\n\nReply here anytime if you have any questions. Happy to help.\n\nThank you,\n${officer.name}\nMS Lending`
  if (channel === 'sms')
    return `Hi ${first}, it's ${offFirst} at MS Lending — quick update on your loan: ${NEXT_STEP[b.status].toLowerCase()}. Text me back anytime!`
  return ''
}

/* ---------- the Call / Text / Email action bar ---------- */
function ContactBar({ b, connections, onPick }) {
  return (
    <div className="mb-5 flex flex-wrap items-center gap-2 rounded-xl border border-slate-200/80 bg-white px-3 py-2.5 shadow-[0_1px_2px_rgba(16,24,40,0.04)] dark:border-white/10 dark:bg-navy-900">
      <span className="mr-1 text-xs font-medium text-slate-400">Reach out</span>
      {Object.entries(CHANNELS).map(([key, c]) => {
        const prov = channelProvider(key, connections)
        const Icon = c.icon
        return (
          <button
            key={key}
            onClick={() => onPick(key)}
            title={prov ? `${c.label} via ${prov.name}` : `Connect a provider to ${c.label.toLowerCase()}`}
            className={cx(
              'inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-[13px] font-medium transition-all duration-150 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-500/40',
              prov
                ? 'border-slate-300/80 bg-white text-slate-700 shadow-[0_1px_1px_rgba(16,24,40,0.04)] hover:border-slate-400/80 hover:text-navy-900'
                : 'border-dashed border-slate-300 bg-slate-50/40 text-slate-400 hover:text-slate-600',
            )}
          >
            <Icon className="h-4 w-4" strokeWidth={1.75} />
            {c.label}
            {prov ? (
              <span className="h-1.5 w-1.5 rounded-full bg-sage-500" />
            ) : (
              <Plug className="h-3 w-3 opacity-60" />
            )}
          </button>
        )
      })}
      <span className="ml-auto hidden text-xs text-slate-400 sm:block">
        {b.lastContact ? `Last contact ${relDate(b.lastContact)}` : 'No contact logged yet'}
      </span>
    </div>
  )
}

/* ---------- compose / log modal (adapts per channel) ---------- */
export function ComposeModal({ b, channel, connections, officer, onClose }) {
  const { logCommunication, sendMessage, emailReady, go } = useApp()
  const c = CHANNELS[channel]
  const prov = channelProvider(channel, connections)
  const first = b.name.split(' ')[0]
  const Icon = c.icon
  const [subject, setSubject] = useState(`Your ${b.loanType} loan with MS Lending`)
  const [body, setBody] = useState(() => defaultBody(channel, b, officer))
  const [note, setNote] = useState('')

  /* not connected → prompt to connect */
  if (!prov) {
    return (
      <Modal
        open
        onClose={onClose}
        title={`Connect to ${c.label.toLowerCase()} ${first}`}
        sub="This channel isn’t connected yet."
      >
        <div className="flex items-start gap-3 rounded-xl border border-amber-200/70 bg-amber-50 p-3.5">
          <Plug className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
          <p className="text-[13px] leading-relaxed text-amber-800">
            To {c.label.toLowerCase()} borrowers right from their file, connect one of these in Integrations:{' '}
            <span className="font-medium">{c.providers.map((p) => PROVIDER_NAMES[p]).join(' or ')}</span>.
          </p>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Btn variant="ghost" onClick={onClose}>
            Not now
          </Btn>
          <Btn
            onClick={() => {
              onClose()
              go('integrations')
            }}
          >
            <Plug className="h-3.5 w-3.5" /> Open Integrations
          </Btn>
        </div>
      </Modal>
    )
  }

  const send = (e) => {
    e.preventDefault()
    if (channel === 'email') {
      sendMessage(b.id, 'email', body, { subject })
    } else if (channel === 'sms') {
      sendMessage(b.id, 'sms', body)
    } else {
      logCommunication(
        b.id,
        'call',
        `Call logged${note.trim() ? ' — ' + note.trim() : ''}`,
        'Call logged',
      )
    }
    onClose()
  }

  return (
    <Modal
      open
      onClose={onClose}
      wide={channel === 'email'}
      title={channel === 'call' ? `Log a call with ${first}` : `${c.label} ${first}`}
      sub={`via ${prov.name} · ${prov.account}`}
    >
      <form onSubmit={send} className="space-y-4">
        <Field label="To">
          <input className={inputCls} value={b[c.field]} readOnly />
        </Field>

        {channel === 'email' && (
          <Field label="Subject">
            <input className={inputCls} value={subject} onChange={(e) => setSubject(e.target.value)} />
          </Field>
        )}

        {channel === 'call' ? (
          <Field label="Call notes (optional)">
            <textarea
              rows={3}
              className={textareaCls}
              placeholder="What did you cover? This gets logged to the timeline."
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </Field>
        ) : (
          <Field label="Message">
            <textarea
              rows={channel === 'email' ? 7 : 4}
              className={textareaCls}
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
          </Field>
        )}

        <div className="flex items-center justify-between gap-3">
          <p className="flex items-center gap-1.5 text-[11px] text-slate-400">
            <ShieldCheck className="h-3.5 w-3.5 text-sage-500" />
            {channel === 'email' && emailReady
              ? 'Sends for real from your connected email, and logs to the file.'
              : 'Logged to the file & Inbox. Connect email in Settings to send for real.'}
          </p>
          <div className="flex gap-2">
            <Btn variant="ghost" onClick={onClose}>
              Cancel
            </Btn>
            <Btn type="submit">
              <Icon className="h-3.5 w-3.5" />
              {channel === 'call' ? 'Log call' : `Send ${c.label.toLowerCase()}`}
            </Btn>
          </div>
        </div>
      </form>
    </Modal>
  )
}

export default function LoanFile({ id, initialTab = 'Overview' }) {
  const { borrowers, go, openLoan, advanceStatus, requestDocs, setDocStatus, addNote, setFollowUp, nextActionLabel, tasks, completeTask, addTask, connections, logCommunication } = useApp()
  const [tab, setTab] = useState(initialTab)
  const [compose, setCompose] = useState(null)
  const b = borrowers.find((x) => x.id === id)

  if (!b)
    return (
      <EmptyState icon={Users} title="Borrower not found" sub="They may have been removed in this demo session." />
    )

  const officer = officerById(b.officerId)
  const rl = rateLockStatus(b)
  const missing = missingDocs(b)
  const dp = docProgress(b)
  const fileTasks = tasks.filter((t) => t.borrowerId === b.id)
  const openTasks = fileTasks.filter((t) => t.status !== 'Complete')

  const tabBadge = {
    Documents: missing.length || null,
    Tasks: openTasks.length || null,
    Notes: b.notes.length || null,
  }

  return (
    <div>
      {/* ---------- header ---------- */}
      <button
        onClick={() => go('borrowers')}
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition hover:text-navy-800"
      >
        <ArrowLeft className="h-4 w-4" /> All borrowers
      </button>

      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-navy-950 text-[13px] font-semibold text-white">
            {b.name.split(' ').map((w) => w[0]).slice(0, 2).join('')}
          </span>
          <div>
            <h1 className="text-xl font-semibold leading-7 tracking-tight text-navy-950 dark:text-white">
              {b.name}
              {b.coBorrower && <span className="font-normal text-slate-400"> & {b.coBorrower}</span>}
            </h1>
            <p className="mt-1 flex items-center gap-1 text-sm text-slate-500">
              <MapPin className="h-3.5 w-3.5" /> {b.propertyAddress}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <StatusBadge status={b.status} />
              {isOverdue(b) && (
                <Badge cls="bg-rose-50 text-rose-700 ring-rose-600/20">
                  <AlarmClock className="h-3 w-3" /> follow-up {-daysUntil(b.nextFollowUp)}d overdue
                </Badge>
              )}
              {isStuck(b) && (
                <Badge cls="bg-violet-50 text-violet-700 ring-violet-600/20">
                  <Hourglass className="h-3 w-3" /> {daysInStage(b)}d in stage
                </Badge>
              )}
              {rl && (
                <Badge
                  cls={
                    rl.expired
                      ? 'bg-rose-50 text-rose-700 ring-rose-600/20'
                      : rl.soon
                        ? 'bg-amber-50 text-amber-800 ring-amber-600/25'
                        : 'bg-sage-50 text-sage-700 ring-sage-600/20'
                  }
                >
                  <Lock className="h-3 w-3" /> {rl.label}
                </Badge>
              )}
              <Badge cls="bg-slate-50 text-slate-600 ring-slate-400/30">{b.loanType} · {b.purpose}</Badge>
              {b.agentId && agentById(b.agentId) && (
                <button onClick={() => go('partners')} title="View agent partner">
                  <Badge cls="bg-rose-50 text-rose-700 ring-rose-600/20 transition-colors hover:bg-rose-100">
                    🤝 {agentById(b.agentId).name} · {agentById(b.agentId).brokerage}
                  </Badge>
                </button>
              )}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {APPLY_STAGES.includes(b.status) && (
            <Btn
              variant="outline"
              onClick={() =>
                logCommunication(b.id, 'apply', 'Online application link sent to borrower', 'Application link sent')
              }
            >
              <Send className="h-4 w-4" /> Send application
            </Btn>
          )}
          <Btn variant="outline" onClick={() => go('portal', { id: b.id })}>
            <Eye className="h-4 w-4" /> Borrower view
          </Btn>
          {nextActionLabel(b) && (
            <Btn onClick={() => advanceStatus(b.id)}>
              <Zap className="h-4 w-4" /> {nextActionLabel(b)}
            </Btn>
          )}
        </div>
      </div>

      {/* ---------- reach-out bar ---------- */}
      {!isClosedOut(b) && <ContactBar b={b} connections={connections} onPick={setCompose} />}

      {/* ---------- tabs ---------- */}
      <div className="mb-5 flex gap-5 overflow-x-auto border-b border-slate-200 dark:border-white/10">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cx(
              'flex shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 pb-2.5 pt-1 text-[13px] transition-colors',
              tab === t
                ? 'border-navy-800 font-medium text-navy-950 dark:border-white dark:text-white'
                : 'border-transparent text-slate-500 hover:text-navy-800 dark:hover:text-white',
            )}
          >
            {t}
            {tabBadge[t] && (
              <span className="rounded bg-slate-100 px-1 text-[11px] font-medium text-slate-500 tabular-nums">
                {tabBadge[t]}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === 'Overview' && <OverviewTab b={b} {...{ officer, missing, dp, setTab, advanceStatus, requestDocs, setFollowUp, nextActionLabel }} />}
      {tab === 'Borrower Info' && <BorrowerTab b={b} />}
      {tab === 'Loan Details' && <LoanTab b={b} />}
      {tab === 'Documents' && <DocsTab b={b} {...{ missing, dp, requestDocs, setDocStatus }} />}
      {tab === 'Tasks' && <TasksTab b={b} {...{ fileTasks, completeTask, addTask }} />}
      {tab === 'Notes' && <NotesTab b={b} addNote={addNote} />}
      {tab === 'Timeline' && (
        <Card title="Loan file timeline" sub="Every status change, document, call, email, and note — automatically logged.">
          <Timeline events={[...b.timeline].reverse()} />
        </Card>
      )}

      {compose && (
        <ComposeModal
          b={b}
          channel={compose}
          connections={connections}
          officer={officer}
          onClose={() => setCompose(null)}
        />
      )}
    </div>
  )
}

/* ================= Overview ================= */
function OverviewTab({ b, officer, missing, dp, setTab, advanceStatus, requestDocs, setFollowUp, nextActionLabel }) {
  const sla = slaStatus(b)
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card title="Where this file stands">
          <div className="flex items-center justify-between">
            <StatusBadge status={b.status} />
            <span className={cx('text-xs', isStuck(b) ? 'font-semibold text-violet-600' : 'text-slate-400')}>
              {daysInStage(b)} day{daysInStage(b) === 1 ? '' : 's'} in this stage
            </span>
          </div>
          {sla && (
            <div className="mt-3">
              <div className="mb-1 flex items-center justify-between text-[11px]">
                <span className="text-slate-400">Stage SLA</span>
                <span className={cx('tabular-nums', sla.over ? 'font-medium text-rose-600' : 'text-slate-500')}>
                  {sla.days} / {sla.target}d{sla.over ? ' · over' : ''}
                </span>
              </div>
              <ProgressBar pct={sla.pct} tone={sla.over ? 'bg-rose-500' : 'bg-navy-500'} />
            </div>
          )}
          <div className="mt-4 rounded-lg border border-slate-100 bg-slate-50 p-3">
            <p className="text-[11px] font-medium text-slate-400">Current next step</p>
            <p className="mt-1 text-[13px] font-medium text-navy-900">{NEXT_STEP[b.status]}</p>
          </div>
          {nextActionLabel(b) && (
            <Btn className="mt-4 w-full" onClick={() => advanceStatus(b.id)}>
              <Zap className="h-4 w-4" /> {nextActionLabel(b)}
            </Btn>
          )}
          {!isClosedOut(b) && (
            <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <CalendarDays className="h-3.5 w-3.5" />
                Follow-up: <span className={cx('font-medium', isOverdue(b) ? 'text-rose-600' : 'text-slate-700')}>{relDate(b.nextFollowUp)}</span>
              </span>
              <button onClick={() => setFollowUp(b.id, d(3))} className="font-medium text-navy-600 hover:text-navy-800">
                Snooze +3d
              </button>
            </div>
          )}
        </Card>

        <Card title="Loan snapshot">
          <p className="text-2xl font-semibold tracking-tight text-navy-950 tabular-nums">{money(b.amount)}</p>
          <p className="mt-0.5 text-xs text-slate-400">
            {b.loanType} {b.purpose} · {b.term}-yr @ {b.rate}%
          </p>
          <dl className="mt-4 grid grid-cols-2 gap-3">
            <KV k="Est. payment (P&I)" v={money(monthlyPayment(b.amount, b.rate, b.term)) + '/mo'} />
            <KV k="LTV" v={b.propertyValue ? Math.round((b.amount / b.propertyValue) * 100) + '%' : '—'} />
            <KV k="Property value" v={b.propertyValue ? money(b.propertyValue) : '—'} />
            <KV k="Credit score" v={b.creditScore ? `${b.creditScore} · ${creditTier(b.creditScore)}` : '—'} />
          </dl>
        </Card>

        <Card title="People & dates">
          <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3">
            <Avatar officer={officer} size="h-10 w-10 text-xs" />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-navy-900">{officer.name}</p>
              <p className="truncate text-xs text-slate-500">{officer.role}</p>
            </div>
          </div>
          <dl className="mt-4 grid grid-cols-2 gap-3">
            <KV k="Lead created" v={fmtDate(b.createdAt)} />
            <KV k="Last contact" v={b.lastContact ? `${fmtDate(b.lastContact)} (${relDate(b.lastContact)})` : 'Not yet'} />
            <KV k="Next follow-up" v={b.nextFollowUp ? relDate(b.nextFollowUp) : '—'} />
            <KV k="Est. closing" v={b.estClosing ? fmtDateFull(b.estClosing) : 'TBD'} />
          </dl>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card
          title="Missing items"
          action={missing.length > 0 && <Badge cls="bg-amber-50 text-amber-800 ring-amber-600/25">{missing.length} outstanding</Badge>}
        >
          {missing.length === 0 ? (
            <p className="flex items-center gap-2 text-sm text-sage-700">
              <Check className="h-4 w-4" /> Nothing missing — this file is document-complete.
            </p>
          ) : (
            <>
              <ul className="flex flex-wrap gap-1.5">
                {missing.map((x) => (
                  <li key={x.name}>
                    <Badge cls={DOC_STYLES[x.status].badge} dot={DOC_STYLES[x.status].dot}>
                      {x.name}
                    </Badge>
                  </li>
                ))}
              </ul>
              <div className="mt-4 flex gap-2">
                <Btn variant="sage" sm onClick={() => requestDocs(b.id)}>
                  <Send className="h-3 w-3" /> Request Documents
                </Btn>
                <Btn variant="outline" sm onClick={() => setTab('Documents')}>
                  View checklist
                </Btn>
              </div>
            </>
          )}
        </Card>

        <Card title="Document progress">
          <div className="mb-2 flex items-end justify-between">
            <p className="text-2xl font-semibold tracking-tight text-navy-950 tabular-nums">
              {dp.done}
              <span className="text-sm font-normal tracking-normal text-slate-400"> of {dp.total} approved</span>
            </p>
            <span className="text-xs font-semibold text-sage-600">{dp.pct}%</span>
          </div>
          <ProgressBar pct={dp.pct} />
          <div className="mt-4 flex flex-wrap gap-1.5">
            {DOC_STATUSES.map((s) => {
              const n = b.docs.filter((x) => x.status === s).length
              return n > 0 ? (
                <Badge key={s} cls={DOC_STYLES[s].badge} dot={DOC_STYLES[s].dot}>
                  {n} {s}
                </Badge>
              ) : null
            })}
          </div>
        </Card>

        <Card
          title="Latest activity"
          action={
            <button onClick={() => setTab('Timeline')} className="text-xs font-medium text-navy-600 hover:text-navy-800">
              Full timeline →
            </button>
          }
        >
          <Timeline events={[...b.timeline].slice(-3).reverse()} />
        </Card>
      </div>
    </div>
  )
}

/* ================= Borrower Info ================= */
function BorrowerTab({ b }) {
  const pct = b.creditScore ? ((b.creditScore - 300) / 550) * 100 : 0
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <Card title="Contact information">
        <ul className="space-y-3 text-sm">
          <li className="flex items-center gap-3">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-slate-50 text-slate-500">
              <Phone className="h-4 w-4" />
            </span>
            <div>
              <p className="font-medium text-slate-700">{b.phone}</p>
              <p className="text-xs text-slate-400">Mobile</p>
            </div>
          </li>
          <li className="flex items-center gap-3">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-slate-50 text-slate-500">
              <Mail className="h-4 w-4" />
            </span>
            <div>
              <p className="font-medium text-slate-700">{b.email}</p>
              <p className="text-xs text-slate-400">Email</p>
            </div>
          </li>
          <li className="flex items-center gap-3">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-slate-50 text-slate-500">
              <MapPin className="h-4 w-4" />
            </span>
            <div>
              <p className="font-medium text-slate-700">{b.propertyAddress}</p>
              <p className="text-xs text-slate-400">Subject property</p>
            </div>
          </li>
        </ul>
      </Card>

      <Card title="Co-borrower">
        {b.coBorrower ? (
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-teal-100 font-semibold text-teal-700">
              {b.coBorrower.split(' ').map((w) => w[0]).join('')}
            </span>
            <div>
              <p className="text-sm font-semibold text-navy-900">{b.coBorrower}</p>
              <p className="text-xs text-slate-400">Applying jointly</p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-400">No co-borrower on this file.</p>
        )}
      </Card>

      <Card title="Employment">
        <div className="flex items-center gap-3">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-sage-50 text-sage-600">
            <Building2 className="h-4 w-4" strokeWidth={1.75} />
          </span>
          <div>
            <p className="text-sm font-medium text-slate-700">{b.employer}</p>
            <p className="text-xs text-slate-400">Verified via W-2s & pay stubs (sample)</p>
          </div>
        </div>
      </Card>

      <Card title="Credit">
        {b.creditScore ? (
          <>
            <div className="flex items-end justify-between">
              <p className="text-2xl font-semibold tracking-tight text-navy-950 tabular-nums">{b.creditScore}</p>
              <Badge cls="bg-sage-50 text-sage-700 ring-sage-600/20">{creditTier(b.creditScore)}</Badge>
            </div>
            <div className="relative mt-4 h-1.5 rounded-full bg-gradient-to-r from-rose-300 via-amber-300 to-sage-400 opacity-90">
              <span
                className="absolute -top-[3px] h-3 w-3 -translate-x-1/2 rounded-full border-2 border-white bg-navy-900 shadow-sm"
                style={{ left: `${pct}%` }}
              />
            </div>
            <div className="mt-1.5 flex justify-between text-[10px] text-slate-400">
              <span>300</span>
              <span>850</span>
            </div>
          </>
        ) : (
          <p className="text-sm text-slate-400">Credit not pulled yet.</p>
        )}
      </Card>
    </div>
  )
}

/* interactive payment calculator (P&I + estimated taxes & insurance) */
function PaymentCalculator({ b }) {
  const [amount, setAmount] = useState(b.amount)
  const [rate, setRate] = useState(b.rate)
  const [term, setTerm] = useState(b.term)

  const pi = monthlyPayment(amount || 0, rate || 0.01, term)
  const taxes = ((b.propertyValue ?? amount) * 0.011) / 12
  const insurance = 1400 / 12
  const total = pi + taxes + insurance
  const dirty = amount !== b.amount || rate !== b.rate || term !== b.term

  const rows = [
    ['Principal & interest', pi, 'text-navy-900'],
    ['Est. property taxes', taxes, 'text-slate-600'],
    ['Est. homeowners insurance', insurance, 'text-slate-600'],
  ]

  return (
    <Card
      title="Payment calculator"
      sub="Adjust the numbers to explore options"
      action={
        dirty && (
          <button
            onClick={() => {
              setAmount(b.amount)
              setRate(b.rate)
              setTerm(b.term)
            }}
            className="text-xs font-medium text-navy-600 transition-colors hover:text-navy-900"
          >
            Reset
          </button>
        )
      }
    >
      <div className="grid grid-cols-3 gap-2">
        <Field label="Amount">
          <input
            type="number"
            min="0"
            step="1000"
            className={inputCls}
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
          />
        </Field>
        <Field label="Rate %">
          <input
            type="number"
            min="0"
            step="0.125"
            className={inputCls}
            value={rate}
            onChange={(e) => setRate(Number(e.target.value))}
          />
        </Field>
        <Field label="Term">
          <Select
            value={String(term)}
            onChange={(v) => setTerm(Number(v))}
            options={[
              { value: '15', label: '15 yr' },
              { value: '30', label: '30 yr' },
            ]}
          />
        </Field>
      </div>

      <dl className="mt-4 space-y-2 border-t border-slate-100 pt-3">
        {rows.map(([label, val, tone]) => (
          <div key={label} className="flex items-center justify-between text-[13px]">
            <dt className="text-slate-500">{label}</dt>
            <dd className={cx('font-medium tabular-nums', tone)}>{money(val)}/mo</dd>
          </div>
        ))}
        <div className="flex items-center justify-between border-t border-slate-100 pt-2.5">
          <dt className="text-sm font-semibold text-navy-950">Estimated total</dt>
          <dd className="text-lg font-semibold text-navy-950 tabular-nums">
            {money(total)}
            <span className="text-xs font-normal text-slate-400">/mo</span>
          </dd>
        </div>
      </dl>

      <p className="mt-3 rounded-lg border border-sage-100 bg-sage-50/70 p-2.5 text-[11px] leading-relaxed text-slate-500">
        Demo estimate only — taxes & insurance are rough placeholders, not a quote. No MI included.
      </p>
    </Card>
  )
}

/* ================= Loan Details ================= */
function LoanTab({ b }) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <Card title="Loan details" className="lg:col-span-2">
        <dl className="grid grid-cols-2 gap-x-4 gap-y-5 md:grid-cols-3">
          <KV k="Loan type" v={b.loanType} />
          <KV k="Purpose" v={b.purpose} />
          <KV k="Term" v={`${b.term} years`} />
          <KV k="Rate (sample)" v={`${b.rate}%`} />
          <KV k="Requested amount" v={money(b.amount)} />
          <KV k="Property value" v={b.propertyValue ? money(b.propertyValue) : '—'} />
          <KV k="Loan-to-value" v={b.propertyValue ? Math.round((b.amount / b.propertyValue) * 100) + '%' : '—'} />
          <KV k="Credit score" v={b.creditScore ?? '—'} />
          <KV k="Est. closing" v={b.estClosing ? fmtDateFull(b.estClosing) : 'TBD'} />
          <KV k="Property address" v={b.propertyAddress} className="col-span-2 md:col-span-3" />
        </dl>
      </Card>
      <PaymentCalculator b={b} />
    </div>
  )
}

/* ================= Documents ================= */
function DocsTab({ b, missing, dp, requestDocs, setDocStatus }) {
  const { toast } = useApp()
  const requestable = b.docs.filter((x) => x.status === 'Needed' || x.status === 'Rejected').length
  const onFiles = (files) => {
    const outstanding = b.docs.filter((x) => x.status === 'Needed' || x.status === 'Requested' || x.status === 'Rejected')
    const n = Math.min(files.length, outstanding.length)
    outstanding.slice(0, n).forEach((x) => setDocStatus(b.id, x.name, 'Uploaded'))
    toast(n ? `Uploaded ${n} document${n > 1 ? 's' : ''}` : 'Everything is already uploaded', '📎')
  }
  return (
    <Card
      title="Document checklist"
      sub="Change a status to see the file update everywhere — progress, missing items, timeline."
      action={
        <Btn variant="sage" sm onClick={() => requestDocs(b.id)} disabled={requestable === 0}>
          <Send className="h-3 w-3" /> Request Documents
        </Btn>
      }
    >
      <div className="mb-4 flex items-center gap-3">
        <ProgressBar pct={dp.pct} className="h-2.5 flex-1" />
        <span className="whitespace-nowrap text-xs font-medium text-slate-500">
          {dp.done}/{dp.total} approved
        </span>
      </div>
      <DropZone
        className="mb-5"
        onFiles={onFiles}
        label="Drop borrower documents here"
        hint="or click to browse — we’ll match them to the checklist"
      />
      <ul className="divide-y divide-slate-100 dark:divide-white/10">
        {b.docs.map((doc) => (
          <li key={doc.name} className="flex flex-wrap items-center gap-3 py-3">
            <span
              className={cx(
                'grid h-8 w-8 shrink-0 place-items-center rounded-lg',
                doc.status === 'Approved' ? 'bg-sage-50 text-sage-600' : doc.status === 'Rejected' ? 'bg-red-50 text-red-500' : 'bg-slate-50 text-slate-400',
              )}
            >
              <FileText className="h-4 w-4" strokeWidth={1.75} />
            </span>
            <span className="min-w-0 flex-1 text-[13px] font-medium text-slate-700">{doc.name}</span>
            <DocBadge status={doc.status} />
            <Select
              value={doc.status}
              onChange={(s) => setDocStatus(b.id, doc.name, s)}
              options={DOC_STATUSES}
              className="w-32"
            />
          </li>
        ))}
      </ul>
      <p className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-400">
        In the full product, borrowers upload these securely from their phone — and the checklist updates itself.
      </p>
    </Card>
  )
}

/* ================= Tasks ================= */
function TasksTab({ b, fileTasks, completeTask, addTask }) {
  const [title, setTitle] = useState('')
  const [due, setDue] = useState(d(1))
  const open = fileTasks.filter((t) => t.status !== 'Complete')
  const done = fileTasks.filter((t) => t.status === 'Complete')

  const submit = (e) => {
    e.preventDefault()
    if (!title.trim()) return
    addTask({ title: title.trim(), borrowerId: b.id, officerId: b.officerId, due, priority: 'Medium' })
    setTitle('')
  }

  return (
    <Card title={`Tasks for ${b.name.split(' ')[0]}`} sub="Linked straight to this loan file.">
      <form onSubmit={submit} className="mb-5 flex flex-wrap gap-2">
        <input
          className={cx(inputCls, 'min-w-40 flex-1')}
          placeholder="Add a task for this file…"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <input type="date" className={cx(inputCls, 'w-auto')} value={due} onChange={(e) => setDue(e.target.value)} />
        <Btn type="submit">
          <Plus className="h-4 w-4" /> Add
        </Btn>
      </form>
      {open.length === 0 && done.length === 0 ? (
        <EmptyState icon={Check} title="No tasks yet" sub="Add the first one above." />
      ) : (
        <ul className="space-y-2">
          {open.map((t) => (
            <li key={t.id} className="flex items-center gap-3 rounded-lg border border-slate-100 bg-slate-50/70 px-3 py-2.5">
              <button
                onClick={() => completeTask(t.id)}
                title="Mark complete"
                className="grid h-4 w-4 shrink-0 place-items-center rounded-full border-[1.5px] border-slate-300 transition-colors hover:border-sage-600 hover:bg-sage-50"
              />
              <span className="min-w-0 flex-1 text-[13px] text-slate-700">{t.title}</span>
              <PriorityBadge priority={t.priority} />
              <span className={cx('text-xs tabular-nums', daysUntil(t.due) < 0 ? 'font-medium text-rose-600' : 'text-slate-400')}>
                {relDate(t.due)}
              </span>
              <Avatar officer={officerById(t.officerId)} size="h-5 w-5 text-[8px]" />
            </li>
          ))}
          {done.map((t) => (
            <li key={t.id} className="flex items-center gap-3 px-3 py-2 opacity-50">
              <Check className="h-3.5 w-3.5 shrink-0 text-sage-600" />
              <span className="min-w-0 flex-1 text-[13px] text-slate-500 line-through">{t.title}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

/* ================= Notes ================= */
function NotesTab({ b, addNote }) {
  const [text, setText] = useState('')
  const [author, setAuthor] = useState(officerById(b.officerId).name)

  const submit = (e) => {
    e.preventDefault()
    if (!text.trim()) return
    addNote(b.id, text.trim(), author)
    setText('')
  }

  return (
    <div className="space-y-4">
      <Card title="Add a note" sub="Call notes, reminders, anything the team should know.">
        <form onSubmit={submit} className="space-y-3">
          <textarea
            rows={3}
            className={cx(inputCls, 'resize-none')}
            placeholder={`e.g. Spoke with ${b.name.split(' ')[0]} — pay stubs coming Friday…`}
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <div className="flex items-center justify-between gap-2">
            <Select
              value={author}
              onChange={setAuthor}
              options={OFFICERS.map((o) => o.name)}
              className="w-48"
            />
            <Btn type="submit">
              <StickyNote className="h-4 w-4" /> Save note
            </Btn>
          </div>
        </form>
      </Card>
      {b.notes.map((n) => (
        <Card key={n.id}>
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <p className="text-xs font-semibold text-navy-950">{n.author}</p>
            <p className="text-[11px] text-slate-400">
              {fmtDateFull(n.date)} · {relDate(n.date)}
            </p>
          </div>
          <p className="text-[13px] leading-relaxed text-slate-600">{n.text}</p>
        </Card>
      ))}
      {b.notes.length === 0 && <EmptyState icon={StickyNote} title="No notes yet" sub="Add the first one above." />}
    </div>
  )
}
