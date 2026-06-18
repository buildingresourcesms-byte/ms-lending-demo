import { useState } from 'react'
import {
  ArrowLeft,
  Zap,
  Eye,
  Phone,
  Mail,
  MapPin,
  Building2,
  AlarmClock,
  Hourglass,
  FileText,
  Send,
  Plus,
  StickyNote,
  CalendarDays,
  Check,
  Users,
} from 'lucide-react'
import { useApp } from '../store.jsx'
import {
  officerById,
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
  inputCls,
  Field,
  cx,
} from '../ui.jsx'
import { Timeline } from '../events.jsx'

const TABS = ['Overview', 'Borrower Info', 'Loan Details', 'Documents', 'Tasks', 'Notes', 'Timeline']

const creditTier = (s) =>
  !s ? '—' : s >= 740 ? 'Excellent' : s >= 700 ? 'Very good' : s >= 660 ? 'Good' : s >= 620 ? 'Fair' : 'Needs work'

export default function LoanFile({ id, initialTab = 'Overview' }) {
  const { borrowers, go, openLoan, advanceStatus, requestDocs, setDocStatus, addNote, setFollowUp, nextActionLabel, tasks, completeTask, addTask } = useApp()
  const [tab, setTab] = useState(initialTab)
  const b = borrowers.find((x) => x.id === id)

  if (!b)
    return (
      <EmptyState icon={Users} title="Borrower not found" sub="They may have been removed in this demo session." />
    )

  const officer = officerById(b.officerId)
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
            <h1 className="text-xl font-semibold leading-7 tracking-tight text-navy-950">
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
              <Badge cls="bg-slate-50 text-slate-600 ring-slate-400/30">{b.loanType} · {b.purpose}</Badge>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
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

      {/* ---------- tabs ---------- */}
      <div className="mb-5 flex gap-5 overflow-x-auto border-b border-slate-200">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cx(
              'flex shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 pb-2.5 pt-1 text-[13px] transition-colors',
              tab === t
                ? 'border-navy-800 font-medium text-navy-950'
                : 'border-transparent text-slate-500 hover:text-navy-800',
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
        <Card title="Loan file timeline" sub="Every status change, document, call, and note — automatically logged.">
          <Timeline events={[...b.timeline].reverse()} />
        </Card>
      )}
    </div>
  )
}

/* ================= Overview ================= */
function OverviewTab({ b, officer, missing, dp, setTab, advanceStatus, requestDocs, setFollowUp, nextActionLabel }) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="Where this file stands">
          <div className="flex items-center justify-between">
            <StatusBadge status={b.status} />
            <span className={cx('text-xs', isStuck(b) ? 'font-semibold text-violet-600' : 'text-slate-400')}>
              {daysInStage(b)} day{daysInStage(b) === 1 ? '' : 's'} in this stage
            </span>
          </div>
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

      <div className="grid gap-4 lg:grid-cols-3">
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
    <div className="grid gap-4 sm:grid-cols-2">
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

/* ================= Loan Details ================= */
function LoanTab({ b }) {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
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
      <Card title="Estimated payment" sub="Principal & interest only">
        <p className="text-2xl font-semibold tracking-tight text-navy-950 tabular-nums">
          {money(monthlyPayment(b.amount, b.rate, b.term))}
          <span className="text-sm font-normal tracking-normal text-slate-400">/mo</span>
        </p>
        <p className="mt-3 rounded-lg border border-sage-100 bg-sage-50/70 p-3 text-xs leading-relaxed text-slate-600">
          Demo estimate at {b.rate}% over {b.term} years — not a quote, not including taxes, insurance, or MI.
        </p>
      </Card>
    </div>
  )
}

/* ================= Documents ================= */
function DocsTab({ b, missing, dp, requestDocs, setDocStatus }) {
  const requestable = b.docs.filter((x) => x.status === 'Needed' || x.status === 'Rejected').length
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
      <div className="mb-5 flex items-center gap-3">
        <ProgressBar pct={dp.pct} className="h-2.5 flex-1" />
        <span className="whitespace-nowrap text-xs font-medium text-slate-500">
          {dp.done}/{dp.total} approved
        </span>
      </div>
      <ul className="divide-y divide-slate-100">
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
