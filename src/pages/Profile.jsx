import { useState } from 'react'
import {
  Phone,
  Mail,
  BadgeCheck,
  Award,
  Copy,
  Check,
  Link2,
  Users,
  ArrowLeft,
  Briefcase,
} from 'lucide-react'
import { useApp } from '../store.jsx'
import {
  OFFICERS,
  OFFICER_PROFILES,
  officerById,
  applyLinkFor,
  isClosedOut,
} from '../data.js'
import { PageHeader, Card, Avatar, Badge, Btn, cx } from '../ui.jsx'

/* ---- the per-officer shareable apply link ---- */
function ApplyLinkCard({ officer }) {
  const { toast, go } = useApp()
  const [copied, setCopied] = useState(false)
  const link = applyLinkFor(officer)
  const copy = () => {
    try {
      navigator.clipboard?.writeText('https://' + link)
    } catch {
      /* clipboard may be blocked in some contexts; demo only */
    }
    setCopied(true)
    toast('Apply link copied', '📋')
    setTimeout(() => setCopied(false), 1800)
  }
  return (
    <Card title="Your apply link" sub="Share this anywhere — leads route to you, get captured here, then continue to the secure application.">
      <div className="flex items-center gap-2 rounded-lg border border-slate-300/70 bg-slate-50/60 px-3 py-2">
        <Link2 className="h-4 w-4 shrink-0 text-slate-400" />
        <span className="min-w-0 flex-1 truncate font-mono text-[13px] text-navy-900">{link}</span>
        <Btn variant="outline" sm onClick={copy}>
          {copied ? <Check className="h-3.5 w-3.5 text-sage-600" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? 'Copied' : 'Copy'}
        </Btn>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Btn variant="soft" sm onClick={() => go('apply')}>
          Preview the apply page
        </Btn>
      </div>
    </Card>
  )
}

/* ---- team roster (shown in whole-team view) ---- */
function Roster() {
  const { go, borrowers } = useApp()
  return (
    <div>
      <PageHeader title="The Team" sub="Tap a teammate to see their profile, book, and apply link." />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {OFFICERS.map((o) => {
          const book = borrowers.filter((b) => b.officerId === o.id)
          const active = book.filter((b) => !isClosedOut(b)).length
          return (
            <button
              key={o.id}
              onClick={() => go('profile', { id: o.id })}
              className="group flex items-center gap-3 rounded-xl border border-slate-200/80 bg-white p-4 text-left shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition-all duration-200 hover:-translate-y-0.5 hover:border-navy-300/70 hover:shadow-[0_10px_28px_-14px_rgba(16,24,40,0.22)]"
            >
              <Avatar officer={o} size="h-11 w-11 text-sm" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-navy-950">{o.name}</p>
                <p className="truncate text-xs text-slate-400">{o.role}</p>
              </div>
              <span className="text-xs font-medium text-slate-400 tabular-nums">{active} active</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default function Profile() {
  const { view, seat, borrowers, go, setSeat } = useApp()
  const targetId = view.id ?? (seat !== 'team' ? seat : null)
  if (!targetId) return <Roster />

  const officer = officerById(targetId)
  const p = OFFICER_PROFILES[officer.id] ?? { specialties: [], community: [], bio: '', since: '' }
  const book = borrowers.filter((b) => b.officerId === officer.id)
  const active = book.filter((b) => !isClosedOut(b))
  const closed = book.filter((b) => b.status === 'Closed')
  const isMe = seat === officer.id

  const stats = [
    { label: 'Active files', value: active.length },
    { label: 'Closed', value: closed.length },
    { label: 'Total clients', value: book.length },
  ]

  return (
    <div>
      <button
        onClick={() => go('profile', {})}
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition hover:text-navy-800"
      >
        <ArrowLeft className="h-4 w-4" /> The team
      </button>

      {/* hero */}
      <div className="mb-4 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_3px_rgba(16,24,40,0.06)]">
        <div className="h-20 bg-gradient-to-br from-navy-900 to-navy-700" />
        <div className="px-5 pb-5">
          <div className="-mt-9 flex flex-wrap items-end justify-between gap-3">
            <div className="flex items-end gap-3">
              <span className={cx('grid h-18 w-18 shrink-0 place-items-center rounded-2xl text-xl font-semibold text-white ring-4 ring-white', officer.color)} style={{ height: '4.5rem', width: '4.5rem' }}>
                {officer.initials}
              </span>
              <div className="pb-1">
                <h1 className="text-xl font-semibold tracking-tight text-navy-950">{officer.name}</h1>
                <p className="text-[13px] text-slate-500">{officer.role}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 pb-1">
              {!isMe && (
                <Btn variant="outline" onClick={() => setSeat(officer.id)}>
                  <Briefcase className="h-4 w-4" /> View their workspace
                </Btn>
              )}
              {isMe && <Badge cls="bg-sage-50 text-sage-700 ring-sage-600/20" dot="bg-sage-500">This is you</Badge>}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-slate-600">
            <span className="flex items-center gap-1.5">
              <BadgeCheck className="h-4 w-4 text-sage-500" /> {officer.nmls}
            </span>
            <span className="flex items-center gap-1.5">
              <Phone className="h-4 w-4 text-slate-400" /> {officer.phone}
            </span>
            <span className="flex items-center gap-1.5">
              <Mail className="h-4 w-4 text-slate-400" /> {officer.email}
            </span>
          </div>
        </div>
      </div>

      {/* stats */}
      <div className="mb-4 grid grid-cols-3 gap-3">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
            <p className="text-2xl font-semibold tracking-tight text-navy-950 tabular-nums">{s.value}</p>
            <p className="mt-0.5 text-xs text-slate-400">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* about */}
        <Card title="About" sub={p.since}>
          {p.bio && <p className="text-[13px] leading-relaxed text-slate-600">{p.bio}</p>}
          {p.specialties?.length > 0 && (
            <>
              <p className="mb-2 mt-4 text-xs font-medium text-slate-500">Specialties</p>
              <div className="flex flex-wrap gap-1.5">
                {p.specialties.map((s) => (
                  <Badge key={s} cls="bg-navy-50 text-navy-700 ring-navy-600/15">
                    {s}
                  </Badge>
                ))}
              </div>
            </>
          )}
        </Card>

        {/* credentials / community */}
        {p.community?.length > 0 ? (
          <Card title="Credentials & community">
            <ul className="space-y-2">
              {p.community.map((c) => (
                <li key={c} className="flex items-start gap-2.5 text-[13px] text-slate-600">
                  <Award className="mt-0.5 h-3.5 w-3.5 shrink-0 text-sage-600" strokeWidth={2} />
                  {c}
                </li>
              ))}
            </ul>
          </Card>
        ) : (
          <ApplyLinkCard officer={officer} />
        )}
      </div>

      {/* apply link (full width when community card took the right slot) */}
      {p.community?.length > 0 && (
        <div className="mt-4">
          <ApplyLinkCard officer={officer} />
        </div>
      )}
    </div>
  )
}
