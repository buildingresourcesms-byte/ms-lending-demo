import { useState } from 'react'
import { Plus, ChevronLeft, ChevronRight, AlarmClock, Check } from 'lucide-react'
import { useApp } from '../store.jsx'
import { TASK_STATUSES, OFFICERS, officerById, relDate, daysUntil, d, PRIORITY_STYLES } from '../data.js'
import {
  PageHeader,
  Btn,
  PriorityBadge,
  Avatar,
  FilterChip,
  Modal,
  Field,
  Select,
  inputCls,
  cx,
} from '../ui.jsx'

const COL_DOT = {
  'To Do': 'bg-sky-500',
  'In Progress': 'bg-amber-500',
  'Waiting': 'bg-violet-500',
  'Complete': 'bg-sage-600',
}

function TaskCard({ t }) {
  const { borrowers, openLoan, moveTask, completeTask } = useApp()
  const b = borrowers.find((x) => x.id === t.borrowerId)
  const officer = officerById(t.officerId)
  const overdue = t.status !== 'Complete' && daysUntil(t.due) < 0
  const idx = TASK_STATUSES.indexOf(t.status)
  return (
    <div
      className={cx(
        'group rounded-lg border bg-white p-3 shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition-shadow hover:shadow-[0_2px_6px_rgba(16,24,40,0.07)] dark:bg-navy-900',
        overdue ? 'border-rose-200 dark:border-rose-500/30' : 'border-slate-200/80 dark:border-white/10',
        t.status === 'Complete' && 'opacity-60',
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <PriorityBadge priority={t.priority} />
        <span className={cx('flex items-center gap-1 text-[11px] tabular-nums', overdue ? 'font-medium text-rose-600' : 'text-slate-400')}>
          {overdue && <AlarmClock className="h-3 w-3" />} {relDate(t.due)}
        </span>
      </div>
      <p className={cx('mt-2 text-[13px] font-medium leading-snug text-slate-700 dark:text-slate-200', t.status === 'Complete' && 'line-through')}>
        {t.title}
      </p>
      {b && (
        <button
          onClick={() => openLoan(b.id)}
          className="mt-0.5 text-xs text-slate-400 transition-colors hover:text-navy-700"
        >
          {b.name} · {b.status}
        </button>
      )}
      <div className="mt-2.5 flex items-center justify-between">
        <Avatar officer={officer} size="h-5 w-5 text-[8px]" />
        <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
          {t.status !== 'Complete' && (
            <button
              onClick={() => completeTask(t.id)}
              title="Mark complete"
              className="rounded-md p-1 text-slate-400 transition-colors hover:bg-sage-50 hover:text-sage-700"
            >
              <Check className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            onClick={() => moveTask(t.id, -1)}
            disabled={idx === 0}
            title="Move left"
            className="rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-100 disabled:opacity-30"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => moveTask(t.id, 1)}
            disabled={idx === TASK_STATUSES.length - 1}
            title="Move right"
            className="rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-100 disabled:opacity-30"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Tasks() {
  const { tasks, borrowers, addTask, seat, currentOfficer } = useApp()
  const [officer, setOfficer] = useState('All')
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({
    title: '',
    borrowerId: borrowers[0]?.id,
    officerId: seat === 'team' ? 'michelle' : seat,
    due: d(1),
    priority: 'Medium',
  })

  const scopedTasks = seat === 'team' ? tasks : tasks.filter((t) => t.officerId === seat)
  const visible =
    seat !== 'team'
      ? scopedTasks
      : officer === 'All'
        ? tasks
        : tasks.filter((t) => t.officerId === officer)
  const overdueCount = scopedTasks.filter((t) => t.status !== 'Complete' && daysUntil(t.due) < 0).length

  const submit = (e) => {
    e.preventDefault()
    if (!form.title.trim()) return
    addTask({ ...form, title: form.title.trim() })
    setForm((f) => ({ ...f, title: '' }))
    setOpen(false)
  }

  return (
    <div>
      <PageHeader
        title={currentOfficer ? `${currentOfficer.name.split(' ')[0]}’s Tasks` : 'Tasks & Follow-Ups'}
        sub={
          currentOfficer
            ? `${currentOfficer.name.split(' ')[0]}’s to-do board — nothing slips through the cracks.`
            : 'The team’s shared to-do board — nothing slips through the cracks.'
        }
        actions={
          <>
            {overdueCount > 0 && (
              <span className="flex items-center gap-1 text-xs font-medium text-rose-600 tabular-nums">
                <AlarmClock className="h-3.5 w-3.5" /> {overdueCount} overdue
              </span>
            )}
            <Btn onClick={() => setOpen(true)}>
              <Plus className="h-3.5 w-3.5" /> Add Task
            </Btn>
          </>
        }
      />

      {seat === 'team' && (
        <div className="mb-4 flex flex-wrap gap-1.5">
          <FilterChip active={officer === 'All'} onClick={() => setOfficer('All')}>
            Whole team
          </FilterChip>
          {OFFICERS.map((o) => (
            <FilterChip key={o.id} active={officer === o.id} onClick={() => setOfficer(o.id)}>
              {o.name.split(' ')[0]}
            </FilterChip>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        {TASK_STATUSES.map((col) => {
          const colTasks = visible.filter((t) => t.status === col)
          return (
            <div key={col} className="rounded-xl border border-slate-200/60 bg-slate-50/80 p-2.5 dark:border-white/10 dark:bg-white/[0.03]">
              <div className="mb-2.5 flex items-center gap-2 px-1">
                <span className={cx('h-1.5 w-1.5 rounded-full', COL_DOT[col])} />
                <h3 className="text-xs font-semibold text-navy-950 dark:text-white">{col}</h3>
                <span className="ml-auto text-[11px] text-slate-400 tabular-nums">{colTasks.length}</span>
              </div>
              <div className="space-y-2">
                {colTasks.length === 0 ? (
                  <p className="px-1 py-5 text-center text-xs text-slate-400">Nothing here</p>
                ) : (
                  colTasks.map((t) => <TaskCard key={t.id} t={t} />)
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* ---------- add task modal ---------- */}
      <Modal open={open} onClose={() => setOpen(false)} title="Add a task" sub="It’ll land in the To Do column.">
        <form onSubmit={submit} className="space-y-4">
          <Field label="What needs to happen?">
            <input
              autoFocus
              className={inputCls}
              placeholder="e.g. Call borrower about appraisal"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Related borrower">
              <Select
                value={form.borrowerId}
                onChange={(borrowerId) => setForm({ ...form, borrowerId })}
                options={borrowers.map((b) => ({ value: b.id, label: b.name }))}
              />
            </Field>
            <Field label="Assigned to">
              <Select
                value={form.officerId}
                onChange={(officerId) => setForm({ ...form, officerId })}
                options={OFFICERS.map((o) => ({ value: o.id, label: o.name }))}
              />
            </Field>
            <Field label="Due date">
              <input
                type="date"
                className={inputCls}
                value={form.due}
                onChange={(e) => setForm({ ...form, due: e.target.value })}
              />
            </Field>
            <Field label="Priority">
              <Select
                value={form.priority}
                onChange={(priority) => setForm({ ...form, priority })}
                options={['High', 'Medium', 'Low']}
              />
            </Field>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Btn variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Btn>
            <Btn type="submit">
              <Plus className="h-3.5 w-3.5" /> Add task
            </Btn>
          </div>
        </form>
      </Modal>
    </div>
  )
}
