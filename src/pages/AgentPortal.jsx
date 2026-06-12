import { useMemo, useState } from 'react'
import {
  Eye,
  Phone,
  Mail,
  ShieldCheck,
  Send,
  Check,
  Copy,
  Link2,
  Sparkles,
  CalendarDays,
} from 'lucide-react'
import { useApp } from '../store.jsx'
import {
  AGENTS,
  agentById,
  agentDeals,
  agentApplyLink,
  officerById,
  PORTAL_STAGES,
  portalStageIndex,
  STATUS_STYLES,
  LOAN_TYPES,
  money,
  fmtDateFull,
  fmtDate,
  relDate,
  isClosedOut,
  DISCLAIMER,
} from '../data.js'
import { BrandMark, Btn, Select, Field, Badge, StatusBadge, ProgressBar, Avatar, inputCls, cx } from '../ui.jsx'

const BLANK = { name: '', phone: '', loanType: 'Conventional', purpose: 'Purchase' }

/* ============================================================
   Shared agent-side building blocks — used by the real agent app
   (AgentShell) and by the LO-side preview page below.
   ============================================================ */

export function AgentStatsHero({ agent, deals }) {
  const active = deals.filter((b) => !isClosedOut(b))
  const closed = deals.filter((b) => b.status === 'Closed')
  const first = agent.name.split(' ')[0]
  return (
    <div className="rounded-3xl bg-gradient-to-br from-navy-50 via-white to-sage-50 p-6 text-center shadow-sm ring-1 ring-navy-100 sm:p-7">
      <h1 className="font-display text-2xl font-semibold text-navy-900">Hi {first}!</h1>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-600">
        Here’s exactly where your buyers stand — live, without a single “any update?” call.
      </p>
      <div className="mx-auto mt-4 grid max-w-sm grid-cols-3 gap-3">
        {[
          [active.length, 'in motion'],
          [closed.length, 'closed together'],
          ['< 1hr', 'reply time'],
        ].map(([v, l]) => (
          <div key={l} className="rounded-2xl bg-white/80 p-2.5 ring-1 ring-navy-100/60">
            <p className="text-lg font-semibold text-navy-900 tabular-nums">{v}</p>
            <p className="text-[10px] text-slate-400">{l}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

export function BuyerTracker({ deals }) {
  const active = deals.filter((b) => !isClosedOut(b))
  return (
    <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200/70">
      <div className="mb-1 flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-navy-900">Your buyers, live</h2>
        <Badge cls="bg-sage-50 text-sage-700 ring-sage-600/20" dot="bg-sage-500">
          auto-updating
        </Badge>
      </div>
      <p className="mb-4 flex items-center gap-1.5 text-xs text-slate-400">
        <ShieldCheck className="h-3.5 w-3.5 text-sage-500" />
        Status only — never income, credit, or documents.
      </p>
      {active.length === 0 ? (
        <p className="py-6 text-center text-sm text-slate-400">
          No buyers in motion right now — send a referral and watch it appear.
        </p>
      ) : (
        <ul className="space-y-4">
          {active.map((b) => {
            const idx = portalStageIndex(b.status)
            const pct = Math.round(((idx + 1) / PORTAL_STAGES.length) * 100)
            return (
              <li key={b.id} className="rounded-2xl border border-slate-100 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-navy-900">{b.name}</p>
                  <Badge cls="bg-navy-50 text-navy-700 ring-navy-600/15">{PORTAL_STAGES[idx].label}</Badge>
                </div>
                <ProgressBar pct={pct} className="mt-3 h-2" />
                <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                  <span>{PORTAL_STAGES[idx].blurb}</span>
                  {b.estClosing && (
                    <span className="flex items-center gap-1 font-medium text-sage-700">
                      <CalendarDays className="h-3.5 w-3.5" /> closing {relDate(b.estClosing)} · {fmtDateFull(b.estClosing)}
                    </span>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

export function ReferralCard({ agent, officer }) {
  const { addBorrower } = useApp()
  const [form, setForm] = useState(BLANK)
  const [sentName, setSentName] = useState(null)

  const sendReferral = (e) => {
    e.preventDefault()
    if (!form.name.trim()) return
    addBorrower(
      {
        name: form.name.trim(),
        phone: form.phone.trim(),
        email: '',
        loanType: form.loanType,
        purpose: form.purpose,
        amount: '',
        city: agent.market.split(' ')[0],
        source: 'Realtor Referral',
        officerId: officer.id,
        agentId: agent.id,
        viaReferral: true,
        referredBy: `${agent.name} (${agent.brokerage})`,
      },
      { navigate: false },
    )
    setSentName(form.name.trim().split(' ')[0])
    setForm(BLANK)
  }

  return (
    <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200/70">
      <h2 className="text-sm font-semibold text-navy-900">Send {officer.name.split(' ')[0]} a buyer</h2>
      <p className="mt-1 text-xs text-slate-500">
        30 seconds. They get a call within the hour, and you watch every step live.
      </p>
      {sentName ? (
        <div className="mt-4 rounded-2xl bg-sage-50 p-4 text-center ring-1 ring-sage-100">
          <span className="mx-auto grid h-10 w-10 place-items-center rounded-full bg-sage-500 text-white">
            <Check className="h-5 w-5" />
          </span>
          <p className="mt-2 text-sm font-semibold text-sage-900">
            {sentName} is in {officer.name.split(' ')[0]}’s pipeline!
          </p>
          <p className="mt-0.5 text-xs text-sage-700">You’ll see them appear in your tracker the moment there’s movement.</p>
          <button onClick={() => setSentName(null)} className="mt-3 text-xs font-medium text-sage-700 underline-offset-2 hover:underline">
            Send another
          </button>
        </div>
      ) : (
        <form onSubmit={sendReferral} className="mt-4 grid gap-3 sm:grid-cols-2">
          <Field label="Buyer name *">
            <input className={inputCls} placeholder="e.g. Monica Hayes" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </Field>
          <Field label="Phone">
            <input className={inputCls} placeholder="(601) 555-0123" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
          </Field>
          <Field label="Loan type (best guess)">
            <Select value={form.loanType} onChange={(loanType) => setForm((f) => ({ ...f, loanType }))} options={LOAN_TYPES} />
          </Field>
          <Field label="Purpose">
            <Select value={form.purpose} onChange={(purpose) => setForm((f) => ({ ...f, purpose }))} options={['Purchase', 'Refinance', 'Cash-Out Refinance']} />
          </Field>
          <div className="sm:col-span-2 flex justify-end">
            <Btn variant="sage" type="submit" disabled={!form.name.trim()}>
              <Send className="h-3.5 w-3.5" /> Send referral
            </Btn>
          </div>
        </form>
      )}
    </div>
  )
}

/* every deal the agent has sent or repped — their scoreboard */
export function ReferralLedger({ deals }) {
  if (deals.length === 0) return null
  return (
    <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200/70">
      <h2 className="text-sm font-semibold text-navy-900">Your scoreboard with MS Lending</h2>
      <p className="mt-1 text-xs text-slate-500">Every buyer you’ve sent or repped — and exactly where each one stands.</p>
      <ul className="mt-4 divide-y divide-slate-100">
        {deals.map((b) => (
          <li key={b.id} className="flex items-center gap-3 py-2.5">
            <span className={cx('h-2 w-2 shrink-0 rounded-full', STATUS_STYLES[b.status]?.dot ?? 'bg-slate-300')} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-medium text-navy-900">{b.name}</p>
              <p className="truncate text-xs text-slate-400">
                {b.loanType} {b.purpose}
                {b.estClosing && !isClosedOut(b) && ` · closing ${fmtDate(b.estClosing)}`}
              </p>
            </div>
            <StatusBadge status={b.status} />
          </li>
        ))}
      </ul>
    </div>
  )
}

/* Self-serve pre-approval letters, capped by the LO per buyer. */
export function LetterGenerator({ deals, officer, toast }) {
  const eligible = deals.filter((b) => b.preApprovalMax && b.purpose === 'Purchase' && !isClosedOut(b))
  const [buyerId, setBuyerId] = useState(eligible[0]?.id)
  const buyer = eligible.find((b) => b.id === buyerId) ?? eligible[0]
  const [offer, setOffer] = useState(buyer?.preApprovalMax ?? 0)
  const [address, setAddress] = useState('')

  if (eligible.length === 0)
    return (
      <div className="rounded-3xl bg-white p-6 text-center shadow-sm ring-1 ring-slate-200/70">
        <p className="text-sm font-medium text-slate-600">No pre-approved buyers yet</p>
        <p className="mt-1 text-xs text-slate-400">
          The moment {officer.name.split(' ')[0]} pre-approves one of your buyers, you can issue offer letters here 24/7.
        </p>
      </div>
    )

  const cap = buyer?.preApprovalMax ?? 0
  const clamped = Math.min(Number(offer) || 0, cap)
  const overCap = Number(offer) > cap
  const todayLabel = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })

  const pickBuyer = (id) => {
    setBuyerId(id)
    const nb = eligible.find((b) => b.id === id)
    setOffer(nb?.preApprovalMax ?? 0)
  }

  const copyLetter = () => {
    const text = `${todayLabel}\n\nRE: Pre-Approval — ${buyer.name}\n\nTo whom it may concern,\n\n${buyer.name} is pre-approved by MS Lending, LLC for the purchase of ${address.trim() || 'the subject property'} in the amount of ${money(clamped)} (${buyer.loanType}).\n\n${officer.name}, ${officer.role}\n${officer.nmls} · ${officer.phone}\nMS Lending, LLC · NMLS #1833776`
    try {
      navigator.clipboard?.writeText(text)
    } catch {
      /* demo only */
    }
    toast(`Letter at ${money(clamped)} copied — good luck with the offer!`, '📄')
  }

  return (
    <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200/70">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-navy-900">Instant pre-approval letter</h2>
        <Badge cls="bg-sage-50 text-sage-700 ring-sage-600/20" dot="bg-sage-500">
          24/7 — no waiting on us
        </Badge>
      </div>
      <p className="mt-1 text-xs text-slate-500">
        Writing an offer tonight? Generate the letter at your offer price — {officer.name.split(' ')[0]} pre-set each
        buyer’s ceiling, so it’s always accurate.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <Field label="Buyer">
          <Select value={buyer?.id} onChange={pickBuyer} options={eligible.map((b) => ({ value: b.id, label: b.name }))} />
        </Field>
        <Field label={`Offer amount (up to ${money(cap)})`}>
          <input type="number" min="0" step="1000" className={inputCls} value={offer} onChange={(e) => setOffer(e.target.value)} />
        </Field>
        <Field label="Property address (optional)">
          <input className={inputCls} placeholder="118 Periwinkle Cove" value={address} onChange={(e) => setAddress(e.target.value)} />
        </Field>
      </div>
      {overCap && (
        <p className="mt-2 text-xs font-medium text-amber-600">
          Capped at {money(cap)} — need more room? One tap below asks {officer.name.split(' ')[0]} to review.
        </p>
      )}

      <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50/60 p-5 font-serif text-[13px] leading-relaxed text-slate-700">
        <div className="mb-3 flex items-center gap-2.5 border-b border-slate-200 pb-3">
          <BrandMark className="h-8 w-8" />
          <div>
            <p className="font-sans text-[13px] font-semibold text-navy-900">MS Lending, LLC</p>
            <p className="font-sans text-[10px] text-slate-400">742 Magnolia St, Ste D · Madison, MS · NMLS #1833776</p>
          </div>
          <span className="ml-auto font-sans text-[11px] text-slate-400">{todayLabel}</span>
        </div>
        <p>To whom it may concern,</p>
        <p className="mt-2">
          <span className="font-semibold">{buyer?.name}</span> is pre-approved for the purchase of{' '}
          <span className="font-semibold">{address.trim() || 'the subject property'}</span> in the amount of{' '}
          <span className="font-semibold text-navy-900">{money(clamped)}</span> ({buyer?.loanType}).
        </p>
        <p className="mt-3 font-sans text-[12px] text-slate-500">
          {officer.name} · {officer.role} · {officer.nmls}
        </p>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] text-slate-400">Demo letter — the real one is e-signed & PDF.</p>
        <div className="flex gap-2">
          {overCap && (
            <Btn variant="outline" sm onClick={() => toast(`${officer.name.split(' ')[0]} pinged to review a higher cap (demo)`, '📨')}>
              Ask for more room
            </Btn>
          )}
          <Btn variant="sage" sm onClick={copyLetter}>
            <Copy className="h-3.5 w-3.5" /> Copy letter at {money(clamped)}
          </Btn>
        </div>
      </div>
    </div>
  )
}

export function LinkCard({ agent, officer, toast }) {
  const [copied, setCopied] = useState(false)
  const link = agentApplyLink(officer, agent)
  const copyLink = () => {
    try {
      navigator.clipboard?.writeText('https://' + link)
    } catch {
      /* demo only */
    }
    setCopied(true)
    toast('Your co-branded link is copied', '🔗')
    setTimeout(() => setCopied(false), 1600)
  }
  return (
    <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200/70">
      <h2 className="text-sm font-semibold text-navy-900">Your co-branded apply link</h2>
      <p className="mt-1 text-xs text-slate-500">
        Drop it in your listing flyers, texts, and open-house sign-ins — every applicant is tagged to you.
      </p>
      <div className="mt-3 flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2.5">
        <Link2 className="h-4 w-4 shrink-0 text-slate-400" />
        <span className="min-w-0 flex-1 truncate font-mono text-[12px] text-navy-900">{link}</span>
        <Btn variant="outline" sm onClick={copyLink}>
          {copied ? <Check className="h-3.5 w-3.5 text-sage-600" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? 'Copied' : 'Copy'}
        </Btn>
      </div>
    </div>
  )
}

export function LenderCard({ officer, toast }) {
  return (
    <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-navy-900 to-navy-700 p-6 text-white shadow-md">
      <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-sage-200">Your lending partner</p>
      <div className="mt-3 flex items-center gap-4">
        <Avatar officer={officer} size="h-12 w-12 text-sm" />
        <div>
          <p className="font-display text-lg font-semibold">{officer.name}</p>
          <p className="text-xs text-navy-200">
            {officer.role} · {officer.nmls}
          </p>
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
        Your buyers close on time — or you hear from me before anyone has to ask.
      </p>
    </div>
  )
}

export function AgentCobrandHeader({ agent }) {
  return (
    <div className="flex flex-col items-center pt-2 text-center">
      <div className="flex items-center gap-3">
        <BrandMark className="h-11 w-11" />
        <span className="text-lg font-light text-slate-300">×</span>
        <span className={cx('grid h-11 w-11 place-items-center rounded-xl text-sm font-semibold text-white', agent.color)}>
          {agent.initials}
        </span>
      </div>
      <p className="font-display mt-2.5 text-lg font-semibold text-navy-900 dark:text-white">
        MS Lending + {agent.brokerage}
      </p>
      <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-navy-500">Partner Portal</p>
    </div>
  )
}

/* ============================================================
   LO-side preview page (kept so Julene can see what agents see)
   ============================================================ */
export default function AgentPortal({ initialId }) {
  const { borrowers, currentOfficer, toast } = useApp()
  const [agentId, setAgentId] = useState(initialId ?? AGENTS[0].id)
  const agent = agentById(agentId) ?? AGENTS[0]
  const officer = currentOfficer ?? officerById('julene')
  const deals = useMemo(() => agentDeals(borrowers, agent.id), [borrowers, agent.id])

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-navy-950 px-4 py-3.5 text-white">
        <p className="flex items-center gap-2 text-sm text-navy-100">
          <Eye className="h-4 w-4 shrink-0 text-sage-300" />
          <span>
            <span className="font-semibold text-white">Agent program preview</span> — exactly what your partners
            get when they sign in from the front door.
          </span>
        </p>
        <Select
          value={agent.id}
          onChange={setAgentId}
          options={AGENTS.map((a) => ({ value: a.id, label: `${a.name} · ${a.brokerage}` }))}
          className="w-full sm:w-80"
        />
      </div>

      <div className="mx-auto max-w-2xl space-y-4">
        <AgentCobrandHeader agent={agent} />
        <AgentStatsHero agent={agent} deals={deals} />
        <BuyerTracker deals={deals} />
        <ReferralCard agent={agent} officer={officer} />
        <LetterGenerator deals={deals} officer={officer} toast={toast} />
        <LinkCard agent={agent} officer={officer} toast={toast} />
        <LenderCard officer={officer} toast={toast} />
        <div className="space-y-1.5 pb-4 pt-2 text-center">
          <p className="flex items-center justify-center gap-1.5 text-xs text-slate-400">
            <Sparkles className="h-3.5 w-3.5 text-sage-500" /> Partners since {agent.since} · {agent.market}, Mississippi
          </p>
          <p className="text-[10px] text-slate-300">{DISCLAIMER}</p>
        </div>
      </div>
    </div>
  )
}
