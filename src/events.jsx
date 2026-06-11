import {
  Sparkles,
  Phone,
  ArrowRight,
  FileText,
  StickyNote,
  CheckCircle2,
  Mail,
  MessageSquare,
  Send,
} from 'lucide-react'
import { fmtDateFull, relDate } from './data.js'
import { cx } from './ui.jsx'

export const EVENT_META = {
  created: { icon: Sparkles, cls: 'bg-teal-100 text-teal-600' },
  call: { icon: Phone, cls: 'bg-blue-100 text-blue-600' },
  email: { icon: Mail, cls: 'bg-indigo-100 text-indigo-600' },
  sms: { icon: MessageSquare, cls: 'bg-teal-100 text-teal-600' },
  apply: { icon: Send, cls: 'bg-sage-100 text-sage-600' },
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
          <li key={i} className="relative flex gap-3.5 pb-6 last:pb-0">
            {i < events.length - 1 && (
              <span className="absolute left-[15px] top-8 h-[calc(100%-24px)] w-px bg-slate-200" />
            )}
            <span className={cx('z-10 grid h-8 w-8 shrink-0 place-items-center rounded-full', meta.cls)}>
              <Icon className="h-3.5 w-3.5" />
            </span>
            <div className="min-w-0 pt-1">
              <p className="text-sm text-slate-700">{e.text}</p>
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
