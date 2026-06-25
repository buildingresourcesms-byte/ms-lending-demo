import { useMemo, useState } from 'react'
import { Zap, Plus, Users, X, Mail, MessageSquare, Check, Plug, Download, LayoutGrid, Rows3, ArrowLeftRight, AlarmClock } from 'lucide-react'
import { useApp } from '../store.jsx'
import { downloadCsv } from '../csv.js'
import {
  STATUSES,
  LOAN_TYPES,
  OFFICERS,
  officerById,
  money,
  fmtDate,
  relDate,
  daysUntil,
  isOverdue,
  isStuck,
  isClosedOut,
  daysInStage,
  missingDocs,
  docProgress,
  BOARD_COLUMNS,
  UNACTIVE_COLUMN,
  ALL_BOARD_COLUMNS,
  boardColumnById,
  defaultBoardFor,
} from '../data.js'
import {
  PageHeader,
  SearchInput,
  Select,
  FilterChip,
  StatusBadge,
  Avatar,
  ProgressBar,
  Btn,
  Modal,
  Field,
  EmptyState,
  inputCls,
  cx,
} from '../ui.jsx'
import { CHANNELS, channelProvider } from './LoanFile.jsx'

const bulkTextareaCls =
  'w-full rounded-lg border border-slate-300/70 bg-white px-2.5 py-2 text-[13px] leading-relaxed text-slate-700 transition-colors placeholder:text-slate-400 hover:border-slate-400/80 focus:border-navy-500 focus:outline-none focus:ring-2 focus:ring-navy-500/15 resize-none'

/* ---------- send to a whole group at once ---------- */
function BulkComposeModal({ recipients, channel, connections, onClose, onSent }) {
  const { logCommunication, mailBackend, sendMessage, toast, go } = useApp()
  const c = CHANNELS[channel]
  const prov = channelProvider(channel, connections, mailBackend)
  const [subject, setSubject] = useState('A quick update from MS Lending')
  const [body, setBody] = useState(
    channel === 'email'
      ? 'Hi {first},\n\nJust checking in on your loan — let me know if you have any questions at all. I’m here to help.\n\nThank you,\nMS Lending'
      : 'Hi {first}, it’s MS Lending checking in on your loan — text me back anytime with questions!',
  )

  if (!prov) {
    return (
      <Modal open onClose={onClose} title={`Connect to ${c.label.toLowerCase()} a group`} sub="This channel isn’t connected yet.">
        <div className="flex items-start gap-3 rounded-xl border border-amber-200/70 bg-amber-50 p-3.5">
          <Plug className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
          <p className="text-[13px] leading-relaxed text-amber-800">
            To {c.label.toLowerCase()} borrowers in bulk, connect{' '}
            <span className="font-medium">{c.providers.map((p) => p).join(' or ')}</span> in Integrations.
          </p>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Btn variant="ghost" onClick={onClose}>Not now</Btn>
          <Btn onClick={() => { onClose(); go('integrations') }}>
            <Plug className="h-3.5 w-3.5" /> Open Integrations
          </Btn>
        </div>
      </Modal>
    )
  }

  const send = (e) => {
    e.preventDefault()
    recipients.forEach((b) => {
      const first = b.name.split(' ')[0]
      const msg = body.replaceAll('{first}', first)
      if (channel === 'email') {
        sendMessage(b.id, 'email', msg, { subject, demoReply: false })
      } else {
        const preview = msg.length > 40 ? msg.slice(0, 40) + '…' : msg
        logCommunication(b.id, 'sms', `Text sent — “${preview}”`, null)
      }
    })
    toast(
      `${channel === 'email' ? 'Queued email for' : 'Texted'} ${recipients.length} borrower${recipients.length > 1 ? 's' : ''} via ${prov.name}`,
      '📤',
    )
    onSent()
    onClose()
  }

  return (
    <Modal open onClose={onClose} wide={channel === 'email'} title={`${c.label} ${recipients.length} borrowers`} sub={`via ${prov.name} · personalized with each first name`}>
      <form onSubmit={send} className="space-y-4">
        <Field label="Recipients">
          <div className="flex flex-wrap gap-1.5 rounded-lg border border-slate-200 bg-slate-50/60 p-2">
            {recipients.slice(0, 8).map((b) => (
              <span key={b.id} className="rounded-md bg-white px-2 py-0.5 text-xs text-slate-600 ring-1 ring-slate-200">
                {b.name.split(' ')[0]}
              </span>
            ))}
            {recipients.length > 8 && (
              <span className="px-1 py-0.5 text-xs text-slate-400">+{recipients.length - 8} more</span>
            )}
          </div>
        </Field>
        {channel === 'email' && (
          <Field label="Subject">
            <input className={inputCls} value={subject} onChange={(e) => setSubject(e.target.value)} />
          </Field>
        )}
        <Field label="Message">
          <textarea
            rows={channel === 'email' ? 6 : 4}
            className={bulkTextareaCls}
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
          <p className="mt-1 text-[11px] text-slate-400">
            Use <span className="font-mono text-slate-500">{'{first}'}</span> to drop in each borrower’s first name.
          </p>
        </Field>
        <div className="flex justify-end gap-2">
          <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
          <Btn type="submit">
            <c.icon className="h-3.5 w-3.5" /> Send to {recipients.length}
          </Btn>
        </div>
      </form>
    </Modal>
  )
}

function Checkbox({ checked, onClick, title }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={checked}
      title={title}
      aria-label={title}
      className={cx(
        'grid h-4 w-4 shrink-0 place-items-center rounded border transition-colors',
        checked ? 'border-navy-800 bg-navy-800 text-white' : 'border-slate-300 bg-white hover:border-slate-400',
      )}
    >
      {checked && <Check className="h-3 w-3" strokeWidth={3} />}
    </button>
  )
}

/* ============================================================
   JOB BOARD — color-coded lanes in a grid that fits the screen
   (no side-scroll). Move a card by dragging (desktop) OR the move
   menu (works on touch — native drag doesn't fire on phones).
   ============================================================ */
function MoveMenu({ current, onMove }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative shrink-0">
      <button
        onClick={(e) => {
          e.stopPropagation()
          setOpen((o) => !o)
        }}
        title="Move to lane"
        aria-label="Move to a lane"
        className="rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-navy-700 dark:hover:bg-white/10 dark:hover:text-white"
      >
        <ArrowLeftRight className="h-3.5 w-3.5" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-20" onClick={(e) => { e.stopPropagation(); setOpen(false) }} />
          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute right-0 z-30 mt-1 w-44 overflow-hidden rounded-xl border border-slate-200 bg-white p-1 shadow-[0_16px_44px_-8px_rgba(16,24,40,0.25)] dark:border-white/10 dark:bg-navy-900"
          >
            <p className="px-2 pb-1 pt-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Move to</p>
            {ALL_BOARD_COLUMNS.map((col) => (
              <button
                key={col.id}
                onClick={(e) => {
                  e.stopPropagation()
                  if (col.id !== current) onMove(col.id)
                  setOpen(false)
                }}
                className={cx(
                  'flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[13px] transition-colors hover:bg-slate-50 dark:hover:bg-white/5',
                  current === col.id && 'bg-slate-50 dark:bg-white/5',
                )}
              >
                <span className={cx('h-2 w-2 shrink-0 rounded-full', col.dot)} />
                <span className="flex-1 text-slate-700 dark:text-slate-200">{col.label}</span>
                {current === col.id && <Check className="h-3.5 w-3.5 shrink-0 text-sage-600" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function BoardCard({ b, lane }) {
  const { openLoan, setBorrowerBoard, toast } = useApp()
  const overdue = isOverdue(b)
  const dp = docProgress(b)
  const missing = missingDocs(b).length
  const move = (col) => {
    setBorrowerBoard(b.id, col)
    toast(`Moved to ${boardColumnById(col).label}`, '✓')
  }
  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', b.id)
        e.dataTransfer.effectAllowed = 'move'
      }}
      onClick={() => openLoan(b.id)}
      title="Open the file · drag or use the move button to re-file"
      style={{ borderLeftColor: lane.tint }}
      className={cx(
        'group cursor-pointer rounded-xl border border-l-[3px] bg-white p-3 shadow-[0_1px_2px_rgba(16,24,40,0.05)] transition-shadow hover:shadow-[0_4px_14px_-6px_rgba(16,24,40,0.18)] sm:cursor-grab sm:active:cursor-grabbing dark:bg-navy-900',
        overdue ? 'border-rose-200 dark:border-rose-500/30' : 'border-slate-200/80 dark:border-white/10',
        isClosedOut(b) && 'opacity-75',
      )}
    >
      <div className="flex items-start justify-between gap-1.5">
        <p className="min-w-0 text-[13px] font-semibold leading-snug text-navy-950 dark:text-white">
          {b.name}
          {b.coBorrower && <span className="font-normal text-slate-400"> & {b.coBorrower.split(' ')[0]}</span>}
        </p>
        <MoveMenu current={lane.id} onMove={move} />
      </div>
      <p className="mt-0.5 text-[11px] text-slate-400">
        {money(b.amount)} · {b.loanType} · {b.city}
      </p>
      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        <StatusBadge status={b.status} />
        {overdue && (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-rose-600">
            <AlarmClock className="h-3 w-3" /> {-daysUntil(b.nextFollowUp)}d
          </span>
        )}
        {isStuck(b) && !overdue && <span className="text-[11px] text-violet-600">{daysInStage(b)}d in stage</span>}
      </div>
      <div className="mt-2.5 flex items-center gap-2">
        <ProgressBar pct={dp.pct} className="h-1 flex-1" />
        <span className="text-[10px] tabular-nums text-slate-400">{dp.done}/{dp.total}</span>
        <Avatar officer={officerById(b.officerId)} size="h-5 w-5 text-[8px]" />
      </div>
      {missing > 0 && !isClosedOut(b) && (
        <p className="mt-1.5 text-[10px] font-medium text-amber-600">{missing} doc{missing > 1 ? 's' : ''} outstanding</p>
      )}
    </div>
  )
}

function Lane({ col, items }) {
  const { setBorrowerBoard, toast } = useApp()
  const [over, setOver] = useState(false)
  const unactive = col.id === 'unactive'
  return (
    <div
      onDragOver={(e) => {
        e.preventDefault()
        e.dataTransfer.dropEffect = 'move'
        setOver(true)
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setOver(false)
      }}
      onDrop={(e) => {
        e.preventDefault()
        const id = e.dataTransfer.getData('text/plain')
        if (id) {
          setBorrowerBoard(id, col.id)
          toast(`Moved to ${col.label}`, '✓')
        }
        setOver(false)
      }}
      className={cx(
        'flex min-w-0 flex-col rounded-2xl border p-2.5 transition-colors',
        over
          ? 'border-navy-400/70 bg-navy-50/70 dark:border-white/30 dark:bg-white/[0.07]'
          : unactive
            ? 'border-dashed border-slate-300/70 bg-slate-100/60 dark:border-white/10 dark:bg-white/[0.02]'
            : 'border-slate-200/60 bg-slate-50/80 dark:border-white/10 dark:bg-white/[0.03]',
      )}
    >
      <div className="mb-1 flex items-center gap-2 px-1">
        <span className={cx('h-2 w-2 shrink-0 rounded-full', col.dot)} />
        <h3 className="truncate text-[13px] font-semibold text-navy-950 dark:text-white">{col.label}</h3>
        <span className="ml-auto rounded-full bg-white px-1.5 text-[11px] font-medium tabular-nums text-slate-500 ring-1 ring-slate-200 dark:bg-white/10 dark:text-slate-300 dark:ring-white/10">
          {items.length}
        </span>
      </div>
      <p className="mb-2.5 truncate px-1 text-[10px] text-slate-400">{col.blurb}</p>
      <div className="flex-1 space-y-2">
        {items.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-200 px-2 py-5 text-center text-[11px] text-slate-400 dark:border-white/10">
            Empty
          </p>
        ) : (
          items.map((b) => <BoardCard key={b.id} b={b} lane={col} />)
        )}
      </div>
    </div>
  )
}

function BoardView({ filtered, boards }) {
  const byLane = useMemo(() => {
    const map = Object.fromEntries(ALL_BOARD_COLUMNS.map((c) => [c.id, []]))
    filtered.forEach((b) => {
      const lane = boards[b.id] ?? defaultBoardFor(b)
      ;(map[lane] ?? map.misc).push(b)
    })
    return map
  }, [filtered, boards])

  return (
    <div>
      <p className="mb-2 text-[11px] text-slate-400">
        Drag a card between lanes, or tap <ArrowLeftRight className="inline h-3 w-3 align-[-1px]" /> on any card to move it.
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {BOARD_COLUMNS.map((col) => (
          <Lane key={col.id} col={col} items={byLane[col.id]} />
        ))}
        <Lane col={UNACTIVE_COLUMN} items={byLane.unactive} />
      </div>
    </div>
  )
}

export default function Borrowers({ onNewLead }) {
  const { borrowers, crm, setCrm, openLoan, advanceStatus, nextActionLabel, seat, currentOfficer, connections, boards } = useApp()
  const [selected, setSelected] = useState(() => new Set())
  const [bulk, setBulk] = useState(null) // 'email' | 'text' channel for bulk modal
  const [view, setView] = useState('board') // 'board' | 'list'

  const scoped = seat === 'team' ? borrowers : borrowers.filter((b) => b.officerId === seat)

  const filtered = useMemo(() => {
    const q = crm.q.trim().toLowerCase()
    return scoped
      .filter((b) => {
        if (q) {
          const hay = `${b.name} ${b.coBorrower ?? ''} ${b.phone} ${b.email} ${b.status} ${b.city}`.toLowerCase()
          if (!hay.includes(q)) return false
        }
        if (crm.status !== 'All' && b.status !== crm.status) return false
        if (crm.officer !== 'All' && b.officerId !== crm.officer) return false
        if (crm.loanType !== 'All' && b.loanType !== crm.loanType) return false
        if (crm.overdue && !isOverdue(b)) return false
        if (crm.missing && missingDocs(b).length === 0) return false
        if (crm.stuck && !isStuck(b)) return false
        if (crm.apply && !b.viaApply) return false
        return true
      })
      .sort((a, z) => {
        // overdue first, closed/lost last, then soonest follow-up
        const rank = (b) => (isClosedOut(b) ? 2 : isOverdue(b) ? 0 : 1)
        if (rank(a) !== rank(z)) return rank(a) - rank(z)
        return (a.nextFollowUp ?? '9999') < (z.nextFollowUp ?? '9999') ? -1 : 1
      })
  }, [scoped, crm])

  const hasFilters =
    crm.q || crm.status !== 'All' || crm.officer !== 'All' || crm.loanType !== 'All' || crm.overdue || crm.missing || crm.stuck || crm.apply

  const clearFilters = () =>
    setCrm({ q: '', status: 'All', officer: 'All', loanType: 'All', overdue: false, missing: false, stuck: false, apply: false })

  /* ---- bulk selection ---- */
  const selectedBorrowers = filtered.filter((b) => selected.has(b.id))
  const allVisibleSelected = filtered.length > 0 && filtered.every((b) => selected.has(b.id))
  const toggle = (id) =>
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  const toggleAll = () =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (allVisibleSelected) filtered.forEach((b) => next.delete(b.id))
      else filtered.forEach((b) => next.add(b.id))
      return next
    })
  const clearSelection = () => setSelected(new Set())

  const exportCsv = () => {
    const headers = ['Name', 'Co-borrower', 'Phone', 'Email', 'Status', 'Loan type', 'Purpose', 'Amount', 'City', 'Officer', 'Source', 'Next follow-up', 'From inquiry']
    const rows = filtered.map((b) => [
      b.name, b.coBorrower || '', b.phone, b.email, b.status, b.loanType, b.purpose,
      b.amount, b.city, officerById(b.officerId).name, b.source, b.nextFollowUp || '', b.viaApply ? 'Yes' : 'No',
    ])
    downloadCsv('ms-lending-borrowers.csv', headers, rows)
  }

  const ViewToggle = () => (
    <div className="inline-flex rounded-lg border border-slate-300/70 p-0.5 dark:border-white/15">
      {[['board', 'Board', LayoutGrid], ['list', 'List', Rows3]].map(([key, label, Icon]) => (
        <button
          key={key}
          onClick={() => setView(key)}
          className={cx(
            'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
            view === key ? 'bg-navy-900 text-white dark:bg-white/15' : 'text-slate-500 hover:text-navy-900 dark:hover:text-white',
          )}
        >
          <Icon className="h-3.5 w-3.5" /> {label}
        </button>
      ))}
    </div>
  )

  return (
    <div>
      <PageHeader
        title={currentOfficer ? `${currentOfficer.name.split(' ')[0]}’s Borrowers` : 'Borrowers & Leads'}
        sub={
          currentOfficer
            ? `${currentOfficer.name}’s leads, applications, and active loan files.`
            : 'Every lead, application, and active loan file — drag a card to set where it stands.'
        }
        actions={
          <div className="flex items-center gap-2">
            <ViewToggle />
            <Btn variant="outline" onClick={exportCsv} title="Download the current list as a CSV">
              <Download className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Export</span>
            </Btn>
            <Btn onClick={onNewLead}>
              <Plus className="h-3.5 w-3.5" /> New Lead
            </Btn>
          </div>
        }
      />

      {/* ---------- filter toolbar ---------- */}
      <div className="mb-4 space-y-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <SearchInput
            value={crm.q}
            onChange={(q) => setCrm({ q })}
            placeholder="Search name, phone, email, status"
            className="w-full sm:w-64"
          />
          <Select value={crm.status} onChange={(status) => setCrm({ status })} label="All statuses" options={STATUSES} className="w-[calc(50%-4px)] sm:w-40" />
          {seat === 'team' && (
            <Select
              value={crm.officer}
              onChange={(officer) => setCrm({ officer })}
              label="All officers"
              options={OFFICERS.map((o) => ({ value: o.id, label: o.name }))}
              className="w-[calc(50%-4px)] sm:w-40"
            />
          )}
          <Select value={crm.loanType} onChange={(loanType) => setCrm({ loanType })} label="All loan types" options={LOAN_TYPES} className="w-[calc(50%-4px)] sm:w-36" />
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <FilterChip active={crm.overdue} onClick={() => setCrm({ overdue: !crm.overdue })}>
            Overdue follow-ups
          </FilterChip>
          <FilterChip active={crm.missing} onClick={() => setCrm({ missing: !crm.missing })}>
            Missing documents
          </FilterChip>
          <FilterChip active={crm.stuck} onClick={() => setCrm({ stuck: !crm.stuck })}>
            Stuck 10+ days
          </FilterChip>
          <FilterChip active={crm.apply} onClick={() => setCrm({ apply: !crm.apply })}>
            From inquiry link
          </FilterChip>
          <span className="ml-auto flex items-center gap-2 text-xs text-slate-400 tabular-nums">
            {filtered.length} of {scoped.length} files
            {hasFilters && (
              <button
                onClick={clearFilters}
                className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-navy-900"
              >
                <X className="h-3 w-3" /> Clear
              </button>
            )}
          </span>
        </div>
      </div>

      {selected.size > 0 && (
        <div className="animate-slidein mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-navy-200 bg-navy-50/70 px-3 py-2 dark:border-white/15 dark:bg-white/5">
          <span className="text-[13px] font-medium text-navy-900 dark:text-white">
            {selected.size} selected
          </span>
          <div className="ml-auto flex items-center gap-2">
            <Btn variant="outline" sm onClick={() => setBulk('email')}>
              <Mail className="h-3.5 w-3.5" /> Email all
            </Btn>
            <Btn variant="outline" sm onClick={() => setBulk('sms')}>
              <MessageSquare className="h-3.5 w-3.5" /> Text all
            </Btn>
            <button
              onClick={clearSelection}
              className="rounded-md px-2 py-1 text-xs font-medium text-slate-500 transition-colors hover:bg-white hover:text-navy-900"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-slate-200/80 bg-white">
          <EmptyState icon={Users} title="No matching borrowers" sub="Try clearing a filter or two." />
        </div>
      ) : view === 'board' ? (
        <BoardView filtered={filtered} boards={boards} />
      ) : (
        <>
          {/* ---------- desktop table ---------- */}
          <div className="hidden overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)] lg:block dark:border-white/10 dark:bg-navy-900">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-200/70 bg-slate-50/60 text-xs font-medium text-slate-500 dark:border-white/10 dark:bg-white/5">
                  <th className="w-9 py-2.5 pl-4 pr-0 font-medium">
                    <Checkbox checked={allVisibleSelected} onClick={toggleAll} title="Select all on this page" />
                  </th>
                  <th className="px-4 py-2.5 font-medium">Borrower</th>
                  <th className="px-3 py-2.5 font-medium">Loan</th>
                  <th className="px-3 py-2.5 font-medium">Status</th>
                  <th className="px-3 py-2.5 font-medium">Officer</th>
                  <th className="px-3 py-2.5 font-medium">Documents</th>
                  <th className="px-3 py-2.5 font-medium">Follow-up</th>
                  <th className="px-4 py-2.5 text-right font-medium">Next action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/10">
                {filtered.map((b) => {
                  const overdue = isOverdue(b)
                  const stuck = isStuck(b)
                  const dp = docProgress(b)
                  const missing = missingDocs(b).length
                  return (
                    <tr
                      key={b.id}
                      onClick={() => openLoan(b.id)}
                      className={cx(
                        'group cursor-pointer transition-colors hover:bg-slate-50/70 dark:hover:bg-white/5',
                        selected.has(b.id) && 'bg-navy-50/50 dark:bg-white/10',
                      )}
                    >
                      <td className="py-3 pl-4 pr-0" onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selected.has(b.id)}
                          title={`Select ${b.name}`}
                          onClick={(e) => {
                            e.stopPropagation()
                            toggle(b.id)
                          }}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-[13px] font-medium text-navy-950 dark:text-white">
                          {b.name}
                          {b.coBorrower && <span className="font-normal text-slate-400"> & {b.coBorrower.split(' ')[0]}</span>}
                          {b.viaApply && (
                            <span className="ml-1.5 inline-flex items-center rounded bg-sage-50 px-1.5 py-px align-middle text-[10px] font-semibold text-sage-700 ring-1 ring-inset ring-sage-600/20">
                              Inquiry
                            </span>
                          )}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-400">
                          {b.city}, MS · {b.source}
                        </p>
                      </td>
                      <td className="px-3 py-3">
                        <p className="text-[13px] font-medium text-slate-700 tabular-nums">{money(b.amount)}</p>
                        <p className="mt-0.5 text-xs text-slate-400">
                          {b.loanType} · {b.purpose}
                        </p>
                      </td>
                      <td className="px-3 py-3">
                        <StatusBadge status={b.status} />
                        {stuck && <p className="mt-1 text-[11px] text-violet-600">{daysInStage(b)}d in stage</p>}
                      </td>
                      <td className="px-3 py-3">
                        <Avatar officer={officerById(b.officerId)} />
                      </td>
                      <td className="px-3 py-3">
                        <div className="w-24">
                          <div className="mb-1 flex justify-between text-[11px] text-slate-400 tabular-nums">
                            <span>
                              {dp.done}/{dp.total}
                            </span>
                            {missing > 0 && <span className="text-amber-600">{missing} missing</span>}
                          </div>
                          <ProgressBar pct={dp.pct} className="h-1" />
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        {overdue ? (
                          <p className="text-xs font-medium text-rose-600">{-daysUntil(b.nextFollowUp)}d overdue</p>
                        ) : (
                          <p className={cx('text-xs', daysUntil(b.nextFollowUp) === 0 ? 'font-medium text-navy-800' : 'text-slate-500')}>
                            {relDate(b.nextFollowUp)}
                          </p>
                        )}
                        <p className="mt-0.5 text-[11px] text-slate-400">last: {b.lastContact ? fmtDate(b.lastContact) : '—'}</p>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {nextActionLabel(b) ? (
                          <Btn
                            variant="outline"
                            sm
                            className="opacity-70 group-hover:opacity-100"
                            onClick={(e) => {
                              e.stopPropagation()
                              advanceStatus(b.id)
                            }}
                          >
                            <Zap className="h-3 w-3" /> {nextActionLabel(b)}
                          </Btn>
                        ) : (
                          <span className="text-xs text-slate-300">—</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* ---------- mobile cards ---------- */}
          <ul className="space-y-2.5 lg:hidden">
            {filtered.map((b) => {
              const overdue = isOverdue(b)
              const dp = docProgress(b)
              return (
                <li
                  key={b.id}
                  onClick={() => openLoan(b.id)}
                  className={cx(
                    'cursor-pointer rounded-xl border bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)] dark:bg-navy-900',
                    selected.has(b.id) ? 'border-navy-300 dark:border-white/25' : 'border-slate-200/80 dark:border-white/10',
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2.5">
                      <span className="mt-0.5" onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selected.has(b.id)}
                          title={`Select ${b.name}`}
                          onClick={(e) => {
                            e.stopPropagation()
                            toggle(b.id)
                          }}
                        />
                      </span>
                      <div>
                        <p className="text-[13px] font-medium text-navy-950 dark:text-white">
                          {b.name}
                          {b.coBorrower && <span className="font-normal text-slate-400"> & {b.coBorrower.split(' ')[0]}</span>}
                          {b.viaApply && (
                            <span className="ml-1.5 inline-flex items-center rounded bg-sage-50 px-1.5 py-px align-middle text-[10px] font-semibold text-sage-700 ring-1 ring-inset ring-sage-600/20">
                              Inquiry
                            </span>
                          )}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-400">
                          {money(b.amount)} · {b.loanType} · {b.city}
                        </p>
                      </div>
                    </div>
                    <Avatar officer={officerById(b.officerId)} />
                  </div>
                  <div className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                    <StatusBadge status={b.status} />
                    {overdue && (
                      <span className="text-[11px] font-medium text-rose-600">
                        {-daysUntil(b.nextFollowUp)}d overdue
                      </span>
                    )}
                    {isStuck(b) && <span className="text-[11px] text-violet-600">{daysInStage(b)}d in stage</span>}
                  </div>
                  <div className="mt-3 flex items-center gap-3">
                    <ProgressBar pct={dp.pct} className="h-1 flex-1" />
                    <span className="text-[11px] text-slate-400 tabular-nums">
                      {dp.done}/{dp.total} docs
                    </span>
                  </div>
                  {nextActionLabel(b) && (
                    <Btn
                      variant="outline"
                      sm
                      className="mt-3 w-full"
                      onClick={(e) => {
                        e.stopPropagation()
                        advanceStatus(b.id)
                      }}
                    >
                      <Zap className="h-3 w-3" /> {nextActionLabel(b)}
                    </Btn>
                  )}
                </li>
              )
            })}
          </ul>
        </>
      )}

      {bulk && selectedBorrowers.length > 0 && (
        <BulkComposeModal
          recipients={selectedBorrowers}
          channel={bulk}
          connections={connections}
          onClose={() => setBulk(null)}
          onSent={clearSelection}
        />
      )}
    </div>
  )
}
