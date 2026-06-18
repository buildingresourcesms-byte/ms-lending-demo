import { useState } from 'react'
import { Phone, Mail, Upload, Check, ShieldCheck, Eye, PauseCircle } from 'lucide-react'
import { useApp } from '../store.jsx'
import {
  PORTAL_STAGES,
  portalStageIndex,
  officerById,
  money,
  fmtDateFull,
  missingDocs,
  DISCLAIMER,
} from '../data.js'
import { BrandMark, Btn, Select, Badge, cx } from '../ui.jsx'

const FRIENDLY_DOC_STATUS = {
  Uploaded: 'Received — thank you!',
  Reviewed: 'Being reviewed',
  Approved: 'All set ✓',
}

export default function Portal({ initialId }) {
  const { borrowers, setDocStatus, toast } = useApp()
  const fallback = borrowers.find((x) => x.status === 'Underwriting') ?? borrowers[0]
  const [id, setId] = useState(initialId ?? fallback?.id)
  const b = borrowers.find((x) => x.id === id) ?? fallback
  if (!b) return null

  const officer = officerById(b.officerId)
  const stageIdx = portalStageIndex(b.status)
  const missing = missingDocs(b)
  const received = b.docs.filter((x) => ['Uploaded', 'Reviewed', 'Approved'].includes(x.status))
  const first = b.name.split(' ')[0]
  const closed = b.status === 'Closed'
  const lost = b.status === 'Lost'

  const upload = (docName) => {
    setDocStatus(b.id, docName, 'Uploaded')
    toast(`Got it! We'll take a look at your ${docName.toLowerCase()} shortly`, '📎')
  }

  return (
    <div>
      {/* ---------- demo control banner ---------- */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-navy-950 px-4 py-3 text-white">
        <p className="flex items-center gap-2 text-sm text-navy-100">
          <Eye className="h-4 w-4 shrink-0 text-sage-300" />
          <span>
            <span className="font-semibold text-white">Borrower portal preview</span> — this is what your client sees.
          </span>
        </p>
        <Select
          value={b.id}
          onChange={setId}
          options={borrowers.map((x) => ({ value: x.id, label: `${x.name} · ${x.status}` }))}
          className="w-full sm:w-72"
        />
      </div>

      {/* ---------- the portal itself ---------- */}
      <div className="mx-auto max-w-2xl space-y-4">
        {/* brand header */}
        <div className="flex flex-col items-center pt-2 text-center">
          <BrandMark className="h-12 w-12" />
          <p className="font-display mt-2.5 text-lg font-semibold text-navy-900">MS Lending</p>
          <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-navy-500">My Loan</p>
          <p className="mt-1.5 text-xs italic text-slate-400">
            “We’re making getting a mortgage easier than ever before.”
          </p>
        </div>

        {/* greeting hero */}
        <div className="rounded-xl border border-slate-200/80 bg-white p-6 text-center shadow-[0_1px_2px_rgba(16,24,40,0.04)] sm:p-8">
          <h1 className="text-[26px] font-semibold tracking-tight text-navy-950">Hi {first}!</h1>
          {lost ? (
            <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-slate-600">
              Your file is <span className="font-semibold">paused</span> right now — and that’s completely okay.
              We saved everything, so whenever you’re ready, we’ll pick up right where we left off.
            </p>
          ) : closed ? (
            <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-slate-600">
              <span className="font-semibold text-sage-700">Congratulations — your loan is closed!</span>
              <br />
              It was an honor helping you get home, {first}.
            </p>
          ) : (
            <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-slate-600">
              Your loan is moving along. You’re at{' '}
              <span className="font-semibold text-navy-800">{PORTAL_STAGES[stageIdx].label}</span> —{' '}
              {PORTAL_STAGES[stageIdx].blurb.toLowerCase()}
            </p>
          )}
        </div>

        {/* progress stepper */}
        {!lost && (
          <div className="rounded-xl border border-slate-200/80 bg-white p-6 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
            <h2 className="mb-5 text-sm font-semibold text-navy-900">Your loan journey</h2>
            <ol className="space-y-0">
              {PORTAL_STAGES.map((s, i) => {
                const done = i < stageIdx || closed
                const current = i === stageIdx && !closed
                return (
                  <li key={s.label} className="relative flex gap-4 pb-6 last:pb-0">
                    {i < PORTAL_STAGES.length - 1 && (
                      <span
                        className={cx(
                          'absolute left-[15px] top-8 h-[calc(100%-24px)] w-px rounded',
                          done ? 'bg-sage-300' : 'bg-slate-200',
                        )}
                      />
                    )}
                    <span
                      className={cx(
                        'z-10 grid h-8 w-8 shrink-0 place-items-center rounded-full text-[13px] font-semibold',
                        done && 'bg-sage-600 text-white',
                        current && 'animate-softpulse bg-navy-900 text-white',
                        !done && !current && 'bg-slate-100 text-slate-400',
                      )}
                    >
                      {done ? <Check className="h-3.5 w-3.5" /> : i + 1}
                    </span>
                    <div className="pt-1">
                      <p className={cx('text-[13px] font-semibold', current ? 'text-navy-950' : done ? 'text-sage-700' : 'text-slate-400')}>
                        {s.label}
                        {current && (
                          <Badge cls="ml-2 bg-navy-50 text-navy-700 ring-navy-600/20">You are here</Badge>
                        )}
                      </p>
                      {current && <p className="mt-0.5 text-xs text-slate-500">{s.blurb}</p>}
                    </div>
                  </li>
                )
              })}
            </ol>
          </div>
        )}

        {/* documents we still need */}
        {!closed && !lost && missing.length > 0 && (
          <div className="rounded-xl border border-slate-200/80 bg-white p-6 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
            <h2 className="text-sm font-semibold text-navy-900">We still need a few things</h2>
            <p className="mt-1 text-xs text-slate-500">
              A photo from your phone works great — no scanner needed.
            </p>
            <ul className="mt-4 space-y-2.5">
              {missing.map((doc) => (
                <li key={doc.name} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200/70 bg-slate-50/70 px-3.5 py-2.5">
                  <div>
                    <span className="text-[13px] font-medium text-slate-700">{doc.name}</span>
                    {doc.status === 'Rejected' && (
                      <p className="text-xs text-rose-500">We need a clearer copy of this one</p>
                    )}
                  </div>
                  <Btn variant="sage" sm onClick={() => upload(doc.name)}>
                    <Upload className="h-3 w-3" /> Upload
                  </Btn>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* documents received */}
        {received.length > 0 && !lost && (
          <div className="rounded-xl border border-slate-200/80 bg-white p-6 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
            <h2 className="mb-4 text-sm font-semibold text-navy-900">What you’ve sent us</h2>
            <ul className="space-y-2.5">
              {received.map((doc) => (
                <li key={doc.name} className="flex items-center gap-3">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-sage-100 text-sage-600">
                    <Check className="h-3.5 w-3.5" />
                  </span>
                  <span className="min-w-0 flex-1 text-sm text-slate-700">{doc.name}</span>
                  <span className="text-xs text-slate-400">{FRIENDLY_DOC_STATUS[doc.status]}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* what happens next */}
        {!lost && (
          <div className="rounded-xl border border-sage-200/60 bg-sage-50/80 p-5">
            <h2 className="text-sm font-semibold text-sage-900">What happens next</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-sage-800">
              {closed
                ? 'Nothing! Enjoy your home — and we’re always one call away if you ever want to look at your options.'
                : missing.length > 0
                  ? 'Upload the items above whenever you have a minute. After that, we take it from here — no action needed.'
                  : 'Nothing needed from you right now. We’re on it, and we’ll reach out the moment anything changes.'}
            </p>
          </div>
        )}

        {/* loan facts */}
        <div className="grid grid-cols-3 gap-3 rounded-xl border border-slate-200/80 bg-white p-5 text-center shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Loan amount</p>
            <p className="mt-1 text-sm font-semibold text-navy-900">{money(b.amount)}</p>
          </div>
          <div className="border-x border-slate-100">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Loan type</p>
            <p className="mt-1 text-sm font-semibold text-navy-900">{b.loanType}</p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Target closing</p>
            <p className="mt-1 text-sm font-semibold text-navy-900">{b.estClosing ? fmtDateFull(b.estClosing) : 'TBD'}</p>
          </div>
        </div>

        {/* loan officer card */}
        <div className="rounded-xl bg-navy-950 p-6 text-white">
          <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-sage-200">Your loan officer</p>
          <div className="mt-3 flex items-center gap-4">
            <span className={cx('grid h-14 w-14 place-items-center rounded-full text-base font-semibold ring-2 ring-white/30', officer.color)}>
              {officer.initials}
            </span>
            <div>
              <p className="text-[15px] font-semibold tracking-tight">{officer.name}</p>
              <p className="text-xs text-navy-300">{officer.role}</p>
            </div>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-2.5">
            <button
              onClick={() => toast(`Calling ${officer.name.split(' ')[0]}… (demo)`, '📞')}
              className="flex items-center justify-center gap-2 rounded-xl bg-white/10 px-3 py-2.5 text-sm font-medium ring-1 ring-white/20 transition hover:bg-white/20"
            >
              <Phone className="h-4 w-4" /> {officer.phone}
            </button>
            <button
              onClick={() => toast('Opening email… (demo)', '✉️')}
              className="flex items-center justify-center gap-2 rounded-xl bg-white/10 px-3 py-2.5 text-sm font-medium ring-1 ring-white/20 transition hover:bg-white/20"
            >
              <Mail className="h-4 w-4" /> Email
            </button>
          </div>
          <p className="mt-4 text-center text-xs text-navy-200">
            Real people in Madison, MS · Mon–Fri 9–5 · We actually answer.
          </p>
        </div>

        {/* footer */}
        <div className="space-y-1.5 pb-4 pt-2 text-center">
          <p className="flex items-center justify-center gap-1.5 text-xs text-slate-400">
            <ShieldCheck className="h-3.5 w-3.5 text-sage-500" /> Your information stays private and secure.
          </p>
          <p className="text-[10px] text-slate-300">{DISCLAIMER}</p>
        </div>
      </div>
    </div>
  )
}
