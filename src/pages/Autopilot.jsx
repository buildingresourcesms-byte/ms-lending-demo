import { useMemo, useState } from 'react'
import {
  Sparkles,
  AlarmClock,
  KeyRound,
  FileText,
  UserPlus,
  Building2,
  Award,
  Hourglass,
  MessageSquare,
  Mail,
  Send,
  Clock,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react'
import { useApp } from '../store.jsx'
import { d } from '../data.js'
import { buildSuggestions } from '../autopilot.js'
import { PageHeader, Card, Btn, StatusBadge, EmptyState, Field, inputCls, cx } from '../ui.jsx'

const KIND_ICON = {
  'referral-callback': Building2,
  'overdue-followup': AlarmClock,
  'closing-soon': KeyRound,
  'doc-request': FileText,
  'new-lead-intro': UserPlus,
  'send-preapproval': Award,
  stuck: Hourglass,
}
const KIND_TONE = {
  'referral-callback': 'bg-rose-50 text-rose-600 dark:bg-rose-500/15',
  'overdue-followup': 'bg-rose-50 text-rose-600 dark:bg-rose-500/15',
  'closing-soon': 'bg-sage-50 text-sage-700 dark:bg-sage-500/15',
  'doc-request': 'bg-amber-50 text-amber-600 dark:bg-amber-500/15',
  'new-lead-intro': 'bg-sky-50 text-sky-600 dark:bg-sky-500/15',
  'send-preapproval': 'bg-sage-50 text-sage-700 dark:bg-sage-500/15',
  stuck: 'bg-violet-50 text-violet-600 dark:bg-violet-500/15',
}

const textareaCls =
  'w-full rounded-lg border border-slate-300/70 bg-white px-3 py-2 text-[13px] leading-relaxed text-slate-700 transition-colors placeholder:text-slate-400 hover:border-slate-400/80 focus:border-navy-500 focus:outline-none focus:ring-2 focus:ring-navy-500/15 dark:border-white/10 dark:bg-navy-950 dark:text-slate-100'

function SuggestionCard({ s, emailReady, onSend, onSnooze, onOpen }) {
  const Icon = KIND_ICON[s.kind] ?? Sparkles
  const [channel, setChannel] = useState(s.channel)
  const [subject, setSubject] = useState(s.subject)
  const [body, setBody] = useState(s.body)
  const realEmail = channel === 'email' && emailReady

  return (
    <Card pad={false}>
      <div className="flex items-start gap-3 border-b border-slate-100 px-5 py-3 dark:border-white/10">
        <span className={cx('mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg', KIND_TONE[s.kind])}>
          <Icon className="h-[18px] w-[18px]" strokeWidth={2} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[13px] font-semibold text-navy-950 dark:text-white">{s.name}</p>
            <StatusBadge status={s.status} />
          </div>
          <p className="mt-0.5 text-xs text-slate-400">
            <span className="font-medium text-slate-500 dark:text-slate-300">{s.label}</span> · {s.why}
          </p>
        </div>
      </div>

      <div className="px-5 py-3.5">
        <div className="mb-2 inline-flex rounded-lg border border-slate-200 p-0.5 dark:border-white/10">
          {[['sms', 'Text', MessageSquare], ['email', 'Email', Mail]].map(([key, label, I]) => (
            <button
              key={key}
              onClick={() => setChannel(key)}
              className={cx(
                'inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors',
                channel === key ? 'bg-navy-900 text-white dark:bg-white/15' : 'text-slate-500 hover:text-navy-900 dark:hover:text-white',
              )}
            >
              <I className="h-3 w-3" /> {label}
            </button>
          ))}
        </div>

        {channel === 'email' && (
          <input className={cx(inputCls, 'mb-2')} value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject" />
        )}
        <textarea rows={channel === 'email' ? 6 : 3} className={textareaCls} value={body} onChange={(e) => setBody(e.target.value)} />

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <p className="flex items-center gap-1.5 text-[11px] text-slate-400">
            {realEmail ? (
              <><span className="h-1.5 w-1.5 rounded-full bg-sage-500" /> sends for real from your email</>
            ) : (
              <>Drafted for you — review, then send</>
            )}
          </p>
          <div className="flex items-center gap-2">
            <button onClick={() => onOpen(s.borrowerId)} className="rounded-lg px-2 py-1.5 text-xs font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-navy-900 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white">
              Open file
            </button>
            <Btn variant="outline" sm onClick={() => onSnooze(s)}>
              <Clock className="h-3.5 w-3.5" /> Snooze
            </Btn>
            <Btn variant="sage" sm onClick={() => onSend(s, { channel, subject, body })}>
              <Send className="h-3.5 w-3.5" /> Send & schedule
            </Btn>
          </div>
        </div>
      </div>
    </Card>
  )
}

export default function Autopilot() {
  const { borrowers, seat, currentOfficer, sendMessage, setFollowUp, requestDocs, openLoan, emailReady, apHandled, markAutopilotDone, toast } = useApp()

  const suggestions = useMemo(
    () => buildSuggestions(borrowers, seat, apHandled),
    [borrowers, seat, apHandled],
  )

  const onSend = (s, { channel, subject, body }) => {
    if (!body.trim()) return
    sendMessage(s.borrowerId, channel, body, { subject })
    setFollowUp(s.borrowerId, d(3))
    if (s.docRequest) requestDocs(s.borrowerId)
    markAutopilotDone(s.key, 3)
    toast(`Done — ${s.name.split(' ')[0]} handled & next touch scheduled`, '✅')
  }
  const onSnooze = (s) => {
    markAutopilotDone(s.key, 1)
    toast(`Snoozed — ${s.name.split(' ')[0]} back tomorrow`, '💤')
  }

  return (
    <div>
      <PageHeader
        title="Autopilot"
        sub={
          currentOfficer
            ? `${currentOfficer.name.split(' ')[0]}, here’s everything that needs you — already drafted. Review and send.`
            : 'Everything that needs attention — already drafted. Review and send.'
        }
      />

      {suggestions.length === 0 ? (
        <div className="rounded-2xl border border-sage-200/70 bg-gradient-to-br from-sage-50 to-white p-10 text-center dark:border-white/10 dark:from-sage-500/10 dark:to-navy-900">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-sage-500 text-white">
            <CheckCircle2 className="h-6 w-6" />
          </span>
          <p className="mt-3 text-sm font-semibold text-navy-950 dark:text-white">You’re all caught up 🎉</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Every loan is handled. Autopilot will surface the next action the moment one needs you.
          </p>
        </div>
      ) : (
        <>
          <div className="mb-4 flex items-center gap-2 rounded-xl bg-navy-900 px-4 py-2.5 text-white dark:bg-white/10">
            <Sparkles className="h-4 w-4 shrink-0 text-sage-300" />
            <p className="text-[13px] font-medium">
              {suggestions.length} action{suggestions.length > 1 ? 's' : ''} ready for your review — each one’s already written.
            </p>
            <ArrowRight className="ml-auto hidden h-4 w-4 text-navy-300 sm:block" />
          </div>
          <div className="space-y-3">
            {suggestions.map((s) => (
              <SuggestionCard key={s.key} s={s} emailReady={emailReady} onSend={onSend} onSnooze={onSnooze} onOpen={openLoan} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
