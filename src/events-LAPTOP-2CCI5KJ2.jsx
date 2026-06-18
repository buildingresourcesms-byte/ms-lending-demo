import { Sparkles, Phone, ArrowRight, FileText, StickyNote, CheckCircle2 } from 'lucide-react'
import { fmtDateFull, relDate } from './data.js'
import { cx } from './ui.jsx'

export const EVENT_META = {
  created: { icon: Sparkles, cls: 'bg-teal-100 text-teal-600' },
  call: { icon: Phone, cls: 'bg-blue-100 text-blue-600' },
  status: { icon: ArrowRight, cls: 'bg-navy-100 text-navy-600' },
  doc: { icon: FileText, cls: 'bg-violet-100 text-violet-600' },
  note: { icon: StickyNote, cls: 'bg-sky-100 text-sky-600' },
  task: { icon: CheckCircle2, cls: 'bg-sage-100 text-sage-600' },
}

/* vertical activity timeline */
export function Timeline({ events }) {
  return (
    <ol className="relative space-y-0">
      {events.map((e, i) => {
        const meta = EVENT_META[e.type] ?? EVENT_META.note
        const Icon = meta.icon
        return (
          <li key={i} className="relative flex gap-3 pb-5 last:pb-0">
            {i < events.length - 1 && (
              <span className="absolute left-[13px] top-7 h-[calc(100%-20px)] w-px bg-slate-200" />
            )}
            <span className={cx('z-10 grid h-7 w-7 shrink-0 place-items-center rounded-full', meta.cls)}>
              <Icon className="h-3 w-3" strokeWidth={1.75} />
            </span>
            <div className="min-w-0 pt-0.5">
              <p className="text-[13px] text-slate-700">{e.text}</p>
              <p className="mt-0.5 text-xs text-slate-400">
                {fmtDateFull(e.date)} · {relDate(e.date)}
              </p>
            </div>
          </li>
        )
      })}
    </ol>
  )
}
