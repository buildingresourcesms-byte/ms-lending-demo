import { useState } from 'react'
import {
  ShieldCheck,
  ArrowRight,
  ArrowLeft,
  Check,
  ExternalLink,
  Sparkles,
  Eye,
  Lock,
  PartyPopper,
} from 'lucide-react'
import { useApp } from '../store.jsx'
import { LOAN_TYPES, SOURCES, APPLY_URL, APPLY_STEPS, applyLinkFor, officerById } from '../data.js'
import { BrandMark, Btn, Field, Select, Avatar, LegalDisclaimer, PoweredBySolvyr, inputCls, cx } from '../ui.jsx'

const CITIES = ['Brandon', 'Flowood', 'Jackson', 'Madison', 'Pearl', 'Ridgeland', 'Clinton', 'Other']
const PURPOSES = ['Purchase', 'Refinance', 'Cash-Out Refinance']

const BLANK = {
  first: '',
  last: '',
  phone: '',
  email: '',
  source: 'Website',
  purpose: 'Purchase',
  loanType: 'Conventional',
  amount: '',
  city: 'Madison',
}

/* the value story: how the apply button routes through the workspace */
function FlowStrip() {
  const nodes = [
    { label: 'Inquire', sub: 'on the website' },
    { label: 'Your workspace', sub: 'captures the inquiry', hot: true },
    { label: 'Apply', sub: 'finish the 1003' },
  ]
  return (
    <div className="flex items-center justify-center gap-2 text-center">
      {nodes.map((n, i) => (
        <div key={n.label} className="flex items-center gap-2">
          <div
            className={cx(
              'rounded-xl border px-3 py-2',
              n.hot ? 'border-sage-300 bg-sage-50' : 'border-slate-200 bg-white',
            )}
          >
            <p className={cx('text-[11px] font-semibold', n.hot ? 'text-sage-700' : 'text-navy-900')}>{n.label}</p>
            <p className="text-[10px] text-slate-400">{n.sub}</p>
          </div>
          {i < nodes.length - 1 && <ArrowRight className="h-3.5 w-3.5 shrink-0 text-slate-300" />}
        </div>
      ))}
    </div>
  )
}

export default function Apply() {
  const { addBorrower, seat, go, openLoan } = useApp()
  const assignedId = seat === 'team' ? 'julene' : seat
  const officer = officerById(assignedId)

  const [step, setStep] = useState(1)
  const [f, setF] = useState(BLANK)
  const [done, setDone] = useState(null)
  const set = (k) => (v) => setF((s) => ({ ...s, [k]: v }))

  const step1Valid = f.first.trim() && (f.phone.trim() || f.email.trim())

  const submit = (e) => {
    e.preventDefault()
    const name = `${f.first.trim()} ${f.last.trim()}`.trim()
    const id = addBorrower(
      {
        name,
        phone: f.phone.trim(),
        email: f.email.trim(),
        loanType: f.loanType,
        purpose: f.purpose,
        amount: f.amount,
        city: f.city === 'Other' ? 'Madison' : f.city,
        source: f.source,
        officerId: assignedId,
        viaApply: true,
      },
      { navigate: false },
    )
    setDone({ name: f.first.trim() || 'there', id })
  }

  const reset = () => {
    setF(BLANK)
    setStep(1)
    setDone(null)
  }

  return (
    <div>
      {/* demo control banner */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-navy-950 px-4 py-3.5 text-white">
        <p className="flex items-center gap-2 text-sm text-navy-100">
          <Eye className="h-4 w-4 shrink-0 text-sage-300" />
          <span>
            <span className="font-semibold text-white">Inquiry preview</span> — what your website’s “Inquire”
            button opens when routed through the workspace.
          </span>
        </p>
        <span className="flex items-center gap-1.5 rounded-lg bg-white/10 px-2.5 py-1 font-mono text-[11px] text-navy-100">
          <Avatar officer={officer} size="h-4 w-4 text-[7px]" /> {applyLinkFor(officer)}
        </span>
      </div>

      <div className="mx-auto max-w-2xl space-y-4">
        {/* brand header */}
        <div className="flex flex-col items-center pt-2 text-center">
          <BrandMark className="h-12 w-12" />
          <p className="font-display mt-2.5 text-lg font-semibold text-navy-900">MS Lending</p>
          <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-navy-500">Inquire Online</p>
        </div>

        {done ? (
          /* ---------- success / redirect ---------- */
          <div className="space-y-4">
            <div className="rounded-3xl bg-gradient-to-br from-sage-50 via-white to-navy-50 p-8 text-center shadow-sm ring-1 ring-sage-100">
              <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-sage-500 text-white shadow-sm">
                <PartyPopper className="h-7 w-7" />
              </span>
              <h1 className="font-display mt-4 text-2xl font-semibold text-navy-900">
                You’re all set, {done.name}!
              </h1>
              <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-600">
                Your details are saved and your loan officer has been notified. The last step is the full
                application, where you’ll finish the details.
              </p>
              <a
                href={APPLY_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-5 inline-flex items-center justify-center gap-2 rounded-xl bg-sage-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-sage-700"
              >
                <Lock className="h-4 w-4" /> Continue to your application
              </a>
              <p className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
                <ShieldCheck className="h-3.5 w-3.5 text-sage-500" />
                Opens MS Lending’s secure 1003 application in a new tab.
              </p>
            </div>

            {/* who's helping + workspace capture confirmation */}
            <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70">
              <div className="flex items-center gap-3">
                <Avatar officer={officer} size="h-11 w-11 text-sm" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-navy-900">{officer.name} is on it</p>
                  <p className="truncate text-xs text-slate-500">
                    {officer.role} · {officer.phone}
                  </p>
                </div>
              </div>
              <div className="mt-4 flex items-start gap-2 rounded-xl bg-sage-50/70 p-3 text-xs leading-relaxed text-sage-800 ring-1 ring-sage-100">
                <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-sage-600" />
                Captured in the workspace as a new lead — so {officer.name.split(' ')[0]} can follow up even if you
                don’t finish the full application right now.
              </div>
              <button
                onClick={() => openLoan(done.id)}
                className="mt-3 text-xs font-medium text-navy-600 transition-colors hover:text-navy-900"
              >
                (Demo) See the lead this created →
              </button>
            </div>

            <div className="text-center">
              <button onClick={reset} className="text-xs font-medium text-slate-400 transition-colors hover:text-slate-600">
                Start another application
              </button>
            </div>
          </div>
        ) : (
          /* ---------- intake wizard ---------- */
          <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200/70 sm:p-7">
            <FlowStrip />

            {/* step indicator */}
            <div className="mt-6 flex items-center gap-2">
              {[1, 2].map((n) => (
                <div key={n} className="flex flex-1 items-center gap-2">
                  <span
                    className={cx(
                      'grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] font-semibold transition-colors',
                      step >= n ? 'bg-navy-900 text-white' : 'bg-slate-100 text-slate-400',
                    )}
                  >
                    {step > n ? <Check className="h-3.5 w-3.5" /> : n}
                  </span>
                  <span className={cx('text-xs font-medium', step >= n ? 'text-navy-900' : 'text-slate-400')}>
                    {n === 1 ? 'About you' : 'Your loan'}
                  </span>
                  {n === 1 && <span className="h-px flex-1 bg-slate-200" />}
                </div>
              ))}
            </div>

            <form onSubmit={submit} className="mt-6">
              {step === 1 ? (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Field label="First name *">
                    <input autoFocus className={inputCls} placeholder="Monica" value={f.first} onChange={(e) => set('first')(e.target.value)} />
                  </Field>
                  <Field label="Last name">
                    <input className={inputCls} placeholder="Hayes" value={f.last} onChange={(e) => set('last')(e.target.value)} />
                  </Field>
                  <Field label="Phone">
                    <input className={inputCls} placeholder="(601) 555-0123" value={f.phone} onChange={(e) => set('phone')(e.target.value)} />
                  </Field>
                  <Field label="Email">
                    <input type="email" className={inputCls} placeholder="name@email.com" value={f.email} onChange={(e) => set('email')(e.target.value)} />
                  </Field>
                  <Field label="How did you hear about us?" className="sm:col-span-2">
                    <Select value={f.source} onChange={set('source')} options={SOURCES} />
                  </Field>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Field label="What are you looking to do?">
                    <Select value={f.purpose} onChange={set('purpose')} options={PURPOSES} />
                  </Field>
                  <Field label="Loan type">
                    <Select value={f.loanType} onChange={set('loanType')} options={LOAN_TYPES} />
                  </Field>
                  <Field label="Estimated loan amount">
                    <input type="number" min="0" step="1000" className={inputCls} placeholder="250000" value={f.amount} onChange={(e) => set('amount')(e.target.value)} />
                  </Field>
                  <Field label="Property city">
                    <Select value={f.city} onChange={set('city')} options={CITIES} />
                  </Field>
                </div>
              )}

              <p className="mt-4 flex items-center gap-1.5 text-[11px] text-slate-400">
                <Lock className="h-3.5 w-3.5 text-sage-500" />
                Takes about a minute. Your info stays private — no SSN or credit pull at this step.
              </p>

              <div className="mt-5 flex items-center justify-between gap-2">
                {step === 2 ? (
                  <Btn variant="ghost" onClick={() => setStep(1)}>
                    <ArrowLeft className="h-4 w-4" /> Back
                  </Btn>
                ) : (
                  <span />
                )}
                {step === 1 ? (
                  <Btn variant="sage" onClick={() => step1Valid && setStep(2)} disabled={!step1Valid}>
                    Continue <ArrowRight className="h-4 w-4" />
                  </Btn>
                ) : (
                  <Btn variant="sage" type="submit">
                    <Check className="h-4 w-4" /> Submit & continue
                  </Btn>
                )}
              </div>
            </form>
          </div>
        )}

        {/* what to expect */}
        {!done && (
          <div className="rounded-3xl bg-sage-50 p-6 ring-1 ring-sage-100">
            <h2 className="text-sm font-semibold text-sage-900">What happens after you inquire</h2>
            <ol className="mt-3 space-y-2">
              {APPLY_STEPS.map((s, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm text-sage-800">
                  <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-white text-[10px] font-bold text-sage-700 ring-1 ring-sage-200">
                    {i + 1}
                  </span>
                  {s}
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* legal — customers must see this */}
        <LegalDisclaimer />
        <PoweredBySolvyr className="pb-4 pt-1" />
      </div>
    </div>
  )
}
