import { useState } from 'react'
import {
  Phone,
  Mail,
  Upload,
  Check,
  ShieldCheck,
  Eye,
  ExternalLink,
  Building2,
  Share2,
  Lock,
  Users,
  Send,
  Plus,
  Trash2,
  X,
  FileText,
  Home,
  ListChecks,
  MessageSquare,
} from 'lucide-react'
import { useApp } from '../store.jsx'
import {
  PORTAL_STAGES,
  portalStageIndex,
  officerById,
  money,
  fmtDateFull,
  missingDocs,
  APPLY_URL,
  APPLY_TAGLINE,
  APPLY_STEPS,
  DISCLAIMER,
  COMPANY,
  SHARE_ITEMS,
  SHARE_RELATIONS,
  VAULT_SUGGESTIONS,
} from '../data.js'
import { BrandMark, Btn, Select, Badge, DropZone, Field, LegalDisclaimer, PoweredBySolvyr, inputCls, cx } from '../ui.jsx'

const FRIENDLY_DOC_STATUS = {
  Uploaded: 'Received — thank you!',
  Reviewed: 'Being reviewed',
  Approved: 'All set ✓',
}

const chatTime = (at) => {
  try {
    return new Date(at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
  } catch {
    return ''
  }
}

const sectionCls = 'rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200/70'

/* ---------- About MS Lending — make sure they know it's a mortgage lender ---------- */
function AboutLender({ officer }) {
  return (
    <div className="overflow-hidden rounded-3xl border border-navy-100 bg-gradient-to-br from-white to-navy-50 p-6 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-navy-900 text-white">
          <Building2 className="h-5 w-5" />
        </span>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-navy-500">Your mortgage lender</p>
          <h2 className="font-display text-lg font-semibold text-navy-900">{COMPANY.name}</h2>
          <p className="text-xs font-medium text-sage-700">{COMPANY.kind} · {COMPANY.city} · {COMPANY.nmls}</p>
        </div>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-slate-600">
        “MS Lending” is short and friendly — but make no mistake, we’re a <span className="font-semibold text-navy-800">mortgage lender</span>.
        We help Mississippi families buy homes and refinance, and we handle your loan from the first hello all the way to the keys.
      </p>
      <div className="mt-4 flex flex-wrap gap-2 text-xs">
        <a href={`tel:${COMPANY.phone.replace(/[^\d]/g, '')}`} className="inline-flex items-center gap-1.5 rounded-lg bg-white px-2.5 py-1.5 font-medium text-navy-800 ring-1 ring-slate-200 transition hover:ring-navy-300">
          <Phone className="h-3.5 w-3.5 text-sage-600" /> {COMPANY.phone}
        </a>
        <a href={`https://${COMPANY.site}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-lg bg-white px-2.5 py-1.5 font-medium text-navy-800 ring-1 ring-slate-200 transition hover:ring-navy-300">
          <ExternalLink className="h-3.5 w-3.5 text-sage-600" /> {COMPANY.site}
        </a>
      </div>
    </div>
  )
}

/* ---------- the post-close vault: keep the will, insurance, deed… ---------- */
function Vault({ b, viewerName, canEdit, closed }) {
  const { vault, addVaultDoc, removeVaultDoc } = useApp()
  const items = vault[b.id] ?? []
  const stored = new Set(items.map((x) => x.name.toLowerCase()))
  const [custom, setCustom] = useState('')
  const suggestions = VAULT_SUGGESTIONS.filter((s) => !stored.has(s.toLowerCase()))

  return (
    <div className={sectionCls}>
      <div className="flex items-start gap-2.5">
        <Lock className="mt-0.5 h-4 w-4 shrink-0 text-sage-600" />
        <div>
          <h2 className="text-sm font-semibold text-navy-900">Your document vault</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            {closed
              ? 'Your loan is closed — but this stays open. Keep your important paperwork here, safe and in one place.'
              : 'A secure place for the documents that matter — even long after closing.'}
          </p>
        </div>
      </div>

      {items.length > 0 && (
        <ul className="mt-4 space-y-2">
          {items.map((v) => (
            <li key={v.id} className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3 ring-1 ring-slate-200/70">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-white text-sage-600 ring-1 ring-slate-200">
                <FileText className="h-3.5 w-3.5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-slate-700">{v.name}</span>
                <span className="block text-[11px] text-slate-400">Stored · added by {v.addedBy}</span>
              </span>
              {canEdit && (
                <button onClick={() => removeVaultDoc(b.id, v.id)} title="Remove" aria-label={`Remove ${v.name}`} className="rounded-md p-1 text-slate-300 transition-colors hover:bg-white hover:text-rose-500">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {canEdit && (
        <>
          {suggestions.length > 0 && (
            <div className="mt-4">
              <p className="mb-1.5 text-[11px] font-medium text-slate-400">Quick add</p>
              <div className="flex flex-wrap gap-1.5">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    onClick={() => addVaultDoc(b.id, s, viewerName)}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 transition hover:border-sage-300 hover:text-sage-700"
                  >
                    <Plus className="h-3 w-3" /> {s}
                  </button>
                ))}
              </div>
            </div>
          )}
          <form
            onSubmit={(e) => {
              e.preventDefault()
              if (!custom.trim()) return
              addVaultDoc(b.id, custom, viewerName)
              setCustom('')
            }}
            className="mt-3 flex flex-wrap gap-2"
          >
            <input className={cx(inputCls, 'min-w-40 flex-1')} placeholder="Add your own — e.g. Life insurance policy" value={custom} onChange={(e) => setCustom(e.target.value)} />
            <Btn variant="sage" type="submit" disabled={!custom.trim()}><Plus className="h-3.5 w-3.5" /> Save</Btn>
          </form>
        </>
      )}
    </div>
  )
}

/* ---------- group chat: everyone in the portal sees & talks here ---------- */
function GroupChat({ b, officer, viewer, shares }) {
  const { portalChat, postPortalMessage } = useApp()
  const thread = portalChat[b.id] ?? []
  const [text, setText] = useState('')
  const people = [
    { name: officer.name, role: 'Loan Officer' },
    { name: b.name, role: 'Borrower' },
    ...shares.map((s) => ({ name: s.name, role: s.relation })),
  ]
  const send = (e) => {
    e.preventDefault()
    if (!text.trim()) return
    postPortalMessage(b.id, { author: viewer.name, role: viewer.role, text })
    setText('')
  }
  return (
    <div className={sectionCls}>
      <div className="flex items-center gap-2.5">
        <Users className="h-4 w-4 shrink-0 text-navy-700" />
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold text-navy-900">Group chat</h2>
          <p className="text-xs text-slate-500">Everyone invited to your portal can read and reply here.</p>
        </div>
        <div className="flex -space-x-1.5">
          {people.slice(0, 5).map((p, i) => (
            <span key={i} title={`${p.name} · ${p.role}`} className="grid h-6 w-6 place-items-center rounded-full bg-navy-100 text-[9px] font-semibold text-navy-700 ring-2 ring-white">
              {p.name.split(' ').map((w) => w[0]).slice(0, 2).join('')}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {thread.length === 0 ? (
          <p className="rounded-2xl bg-slate-50 px-4 py-6 text-center text-xs text-slate-400">
            No messages yet — say hello to kick things off.
          </p>
        ) : (
          thread.map((m) => {
            const mine = m.author === viewer.name
            return (
              <div key={m.id} className={cx('flex flex-col', mine ? 'items-end' : 'items-start')}>
                <div className={cx('max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed', mine ? 'bg-navy-900 text-white' : 'bg-slate-100 text-slate-700')}>
                  {!mine && <p className="mb-0.5 text-[11px] font-semibold text-navy-600">{m.author} · <span className="font-normal text-slate-400">{m.role}</span></p>}
                  {m.text}
                </div>
                <p className="mt-1 px-1 text-[10px] text-slate-400">{chatTime(m.at)}</p>
              </div>
            )
          })
        )}
      </div>

      <form onSubmit={send} className="mt-4 flex gap-2">
        <input className={cx(inputCls, 'flex-1')} placeholder={`Message as ${viewer.name.split(' ')[0]}…`} value={text} onChange={(e) => setText(e.target.value)} />
        <Btn type="submit" disabled={!text.trim()}><Send className="h-3.5 w-3.5" /> Send</Btn>
      </form>
    </div>
  )
}

/* ---------- share manager: invite anyone, pick what each person sees ---------- */
function ShareManager({ b }) {
  const { shares, addShare, updateSharePerms, removeShare } = useApp()
  const list = shares[b.id] ?? []
  const [form, setForm] = useState({ email: '', name: '', relation: SHARE_RELATIONS[0] })

  const invite = (e) => {
    e.preventDefault()
    if (!form.email.trim()) return
    addShare(b.id, form)
    setForm({ email: '', name: '', relation: SHARE_RELATIONS[0] })
  }
  const togglePerm = (s, item) => updateSharePerms(b.id, s.id, { ...s.perms, [item]: !s.perms[item] })

  return (
    <div className="rounded-3xl border border-sage-100 bg-gradient-to-br from-sage-50 to-white p-6 shadow-sm">
      <div className="flex items-start gap-2.5">
        <Share2 className="mt-0.5 h-4 w-4 shrink-0 text-sage-600" />
        <div>
          <h2 className="text-sm font-semibold text-navy-900">Share your portal</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Invite anyone — your spouse, your agent, your attorney. They get their own login, and <span className="font-medium text-slate-700">you</span> choose exactly what each person can see.
          </p>
        </div>
      </div>

      {/* invite form */}
      <form onSubmit={invite} className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_auto]">
        <input className={inputCls} type="email" placeholder="Their email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
        <input className={inputCls} placeholder="Their name (optional)" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
        <div className="flex gap-2">
          <Select value={form.relation} onChange={(relation) => setForm((f) => ({ ...f, relation }))} options={SHARE_RELATIONS} className="flex-1 sm:w-44" />
          <Btn variant="sage" type="submit" disabled={!form.email.trim()}><Send className="h-3.5 w-3.5" /> Invite</Btn>
        </div>
      </form>

      {/* invitees + their per-item permissions */}
      {list.length > 0 && (
        <ul className="mt-4 space-y-3">
          {list.map((s) => (
            <li key={s.id} className="rounded-2xl bg-white p-4 ring-1 ring-slate-200/70">
              <div className="flex items-center gap-2.5">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-navy-100 text-[10px] font-semibold text-navy-700">
                  {s.name.split(' ').map((w) => w[0]).slice(0, 2).join('')}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-navy-900">{s.name}</p>
                  <p className="truncate text-xs text-slate-400">{s.email} · {s.relation}</p>
                </div>
                <button onClick={() => removeShare(b.id, s.id)} title="Remove access" aria-label={`Remove ${s.name}`} className="rounded-md p-1 text-slate-300 transition-colors hover:bg-slate-50 hover:text-rose-500">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <p className="mb-1.5 mt-3 text-[11px] font-medium text-slate-400">{s.name.split(' ')[0]} can see</p>
              <div className="flex flex-wrap gap-1.5">
                {SHARE_ITEMS.map((item) => {
                  const on = !!s.perms[item.id]
                  return (
                    <button
                      key={item.id}
                      onClick={() => togglePerm(s, item.id)}
                      aria-pressed={on}
                      className={cx(
                        'inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-medium transition-colors',
                        on ? 'border-sage-300 bg-sage-50 text-sage-700' : 'border-slate-200 bg-white text-slate-400 hover:border-slate-300',
                      )}
                    >
                      {on ? <Check className="h-3 w-3" /> : <Plus className="h-3 w-3" />} {item.label}
                    </button>
                  )
                })}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default function Portal({ initialId }) {
  const { borrowers, shares, setDocStatus, toast } = useApp()
  const fallback = borrowers.find((x) => x.status === 'Underwriting') ?? borrowers[0]
  const [id, setId] = useState(initialId ?? fallback?.id)
  const [viewer, setViewer] = useState('owner')
  const [activeTab, setActiveTab] = useState('overview')
  const b = borrowers.find((x) => x.id === id) ?? fallback
  if (!b) return null

  const chooseBorrower = (newId) => {
    setId(newId)
    setViewer('owner')
  }

  const officer = officerById(b.officerId)
  const stageIdx = portalStageIndex(b.status)
  const missing = missingDocs(b)
  const received = b.docs.filter((x) => ['Uploaded', 'Reviewed', 'Approved'].includes(x.status))
  const first = b.name.split(' ')[0]
  const closed = b.status === 'Closed'
  const lost = b.status === 'Lost'
  const sharesFor = shares[b.id] ?? []

  /* who is looking at the portal right now (the owner, or an invited guest) */
  const activeShare = viewer === 'owner' ? null : sharesFor.find((s) => s.id === viewer)
  const identity = activeShare ? { name: activeShare.name, role: activeShare.relation } : { name: b.name, role: 'Borrower' }
  const isOwner = !activeShare
  const canSee = (item) => isOwner || !!activeShare?.perms?.[item]

  /* sections become tabs, so it's a tap — not a long scroll */
  const hasDocs = missing.length > 0 || received.length > 0
  const tabs = [
    { id: 'overview', label: 'Overview', icon: Home, show: true },
    { id: 'progress', label: 'Progress', icon: ListChecks, show: !lost && canSee('progress') },
    { id: 'documents', label: 'Documents', icon: FileText, show: !lost && canSee('documents') && hasDocs },
    { id: 'vault', label: 'Vault', icon: Lock, show: canSee('vault') },
    { id: 'chat', label: 'Chat', icon: MessageSquare, show: canSee('chat') },
    { id: 'share', label: 'Share', icon: Share2, show: isOwner },
  ].filter((t) => t.show)
  const tab = tabs.some((t) => t.id === activeTab) ? activeTab : 'overview'

  const upload = (docName) => {
    setDocStatus(b.id, docName, 'Uploaded')
    toast(`Got it! We'll take a look at your ${docName.toLowerCase()} shortly`, '📎')
  }

  const onDrop = (files) => {
    const n = Math.min(files.length, missing.length)
    missing.slice(0, n).forEach((doc) => setDocStatus(b.id, doc.name, 'Uploaded'))
    toast(`Thanks! We got ${n} ${n > 1 ? 'documents' : 'document'} from you`, '📎')
  }

  return (
    <div>
      {/* ---------- demo control banner ---------- */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-navy-950 px-4 py-3.5 text-white">
        <p className="flex items-center gap-2 text-sm text-navy-100">
          <Eye className="h-4 w-4 shrink-0 text-sage-300" />
          <span>
            <span className="font-semibold text-white">Borrower portal preview</span> — this is what your client sees.
          </span>
        </p>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <Select
            value={b.id}
            onChange={chooseBorrower}
            options={borrowers.map((x) => ({ value: x.id, label: `${x.name} · ${x.status}` }))}
            className="w-full sm:w-64"
          />
          <Select
            value={viewer}
            onChange={setViewer}
            options={[{ value: 'owner', label: 'View as: borrower' }, ...sharesFor.map((s) => ({ value: s.id, label: `View as: ${s.name.split(' ')[0]} (${s.relation})` }))]}
            className="w-full sm:w-56"
          />
        </div>
      </div>

      {/* ---------- the portal itself ---------- */}
      <div className="mx-auto max-w-4xl">
        {/* brand header */}
        <div className="flex flex-col items-center pt-2 text-center">
          <BrandMark className="h-12 w-12" />
          <p className="font-display mt-2.5 text-lg font-semibold text-navy-900">MS Lending</p>
          <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-navy-500">Mortgage Lender · My Loan</p>
        </div>

        {!isOwner && (
          <div className="mt-4 flex items-center gap-2 rounded-2xl border border-navy-100 bg-navy-50 px-4 py-2.5 text-xs text-navy-700">
            <Eye className="h-3.5 w-3.5 shrink-0 text-navy-500" />
            You’re viewing {first}’s portal as <span className="font-semibold">{identity.name}</span> ({identity.role}). You only see what {first} chose to share with you.
          </div>
        )}

        {/* tabs + content: chips on mobile, a side rail on desktop */}
        <div className="mt-5 lg:flex lg:gap-6">
          <nav className="mb-4 flex gap-1.5 overflow-x-auto pb-1 lg:mb-0 lg:w-44 lg:shrink-0 lg:flex-col lg:overflow-visible lg:pb-0">
            {tabs.map((t) => {
              const Icon = t.icon
              const active = tab === t.id
              return (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  aria-current={active ? 'page' : undefined}
                  className={cx(
                    'inline-flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-[13px] font-medium transition-colors lg:w-full',
                    active
                      ? 'bg-navy-900 text-white shadow-sm dark:bg-white/15'
                      : 'text-slate-500 hover:bg-slate-100 hover:text-navy-900 dark:text-slate-300 dark:hover:bg-white/10',
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" /> {t.label}
                </button>
              )
            })}
          </nav>

          <div className="min-w-0 flex-1 space-y-4">
            {/* ---- OVERVIEW ---- */}
            {tab === 'overview' && (
              <>
                <div className="rounded-3xl bg-gradient-to-br from-navy-50 via-white to-sage-50 p-6 text-center shadow-sm ring-1 ring-navy-100 sm:p-8">
                  <h1 className="font-display text-3xl font-semibold text-navy-900">Hi {first}!</h1>
                  {!canSee('progress') ? (
                    <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-slate-600">Welcome to {first}’s loan portal with MS Lending.</p>
                  ) : lost ? (
                    <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-slate-600">
                      Your file is <span className="font-semibold">paused</span> right now — and that’s completely okay. We saved everything, so whenever you’re ready, we’ll pick up right where we left off.
                    </p>
                  ) : closed ? (
                    <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-slate-600">
                      <span className="font-semibold text-sage-700">Congratulations — your loan is closed!</span>
                      <br />
                      It was an honor helping you get home, {first}.
                    </p>
                  ) : (
                    <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-slate-600">
                      Your loan is moving along. You’re at <span className="font-semibold text-navy-800">{PORTAL_STAGES[stageIdx].label}</span> — {PORTAL_STAGES[stageIdx].blurb.toLowerCase()}
                    </p>
                  )}
                </div>

                <AboutLender officer={officer} />

                {canSee('facts') && (
                  <div className="grid grid-cols-3 gap-3 rounded-3xl bg-white p-5 text-center shadow-sm ring-1 ring-slate-200/70">
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
                )}

                {!lost && canSee('progress') && (
                  <div className="rounded-3xl bg-sage-50 p-6 ring-1 ring-sage-100">
                    <h2 className="text-sm font-semibold text-sage-900">What happens next</h2>
                    <p className="mt-1.5 text-sm leading-relaxed text-sage-800">
                      {closed
                        ? 'Nothing! Enjoy your home — keep your documents in the Vault tab, and we’re always one call away if you ever want to look at your options.'
                        : missing.length > 0
                          ? 'Head to the Documents tab and upload what we need whenever you have a minute. After that, we take it from here.'
                          : 'Nothing needed from you right now. We’re on it, and we’ll reach out the moment anything changes.'}
                    </p>
                  </div>
                )}

                {canSee('officer') && (
                  <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-navy-900 to-navy-700 p-6 text-white shadow-md">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-sage-200">Your loan officer</p>
                    <div className="mt-3 flex items-center gap-4">
                      <span className={cx('grid h-14 w-14 place-items-center rounded-full text-base font-semibold ring-2 ring-white/30', officer.color)}>{officer.initials}</span>
                      <div>
                        <p className="font-display text-lg font-semibold">{officer.name}</p>
                        <p className="text-xs text-navy-200">{officer.role}</p>
                      </div>
                    </div>
                    <div className="mt-5 grid grid-cols-2 gap-2.5">
                      <button onClick={() => toast(`Calling ${officer.name.split(' ')[0]}… (demo)`, '📞')} className="flex items-center justify-center gap-2 rounded-xl bg-white/10 px-3 py-2.5 text-sm font-medium ring-1 ring-white/20 transition hover:bg-white/20">
                        <Phone className="h-4 w-4" /> {officer.phone}
                      </button>
                      <button onClick={() => toast('Opening email… (demo)', '✉️')} className="flex items-center justify-center gap-2 rounded-xl bg-white/10 px-3 py-2.5 text-sm font-medium ring-1 ring-white/20 transition hover:bg-white/20">
                        <Mail className="h-4 w-4" /> Email
                      </button>
                    </div>
                    <p className="mt-4 text-center text-xs text-navy-200">Real people in Madison, MS · Mon–Fri 9–5 · We actually answer.</p>
                  </div>
                )}
              </>
            )}

            {/* ---- PROGRESS ---- */}
            {tab === 'progress' && (
              <>
                {!closed && (
                  <div className="rounded-3xl border border-sage-100 bg-gradient-to-br from-sage-50 to-white p-6 text-center shadow-sm">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-sage-600">Apply online</p>
                    <h2 className="font-display mt-1.5 text-xl font-semibold text-navy-900">{APPLY_TAGLINE}</h2>
                    <a href={APPLY_URL} target="_blank" rel="noopener noreferrer" onClick={() => toast('Opening your application…', '📝')} className="mt-4 inline-flex items-center justify-center gap-2 rounded-xl bg-sage-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-sage-700">
                      <ExternalLink className="h-4 w-4" />
                      {stageIdx === 0 ? 'Start your application' : 'Continue your application'}
                    </a>
                    <ol className="mx-auto mt-5 max-w-sm space-y-2 text-left">
                      {APPLY_STEPS.map((s, i) => (
                        <li key={i} className="flex items-start gap-2.5 text-xs text-slate-500">
                          <span className="grid h-4 w-4 shrink-0 place-items-center rounded-full bg-sage-100 text-[9px] font-bold text-sage-700">{i + 1}</span>
                          {s}
                        </li>
                      ))}
                    </ol>
                    <p className="mt-4 flex items-center justify-center gap-1.5 text-[10px] text-slate-400">
                      <ShieldCheck className="h-3 w-3 text-sage-500" /> Continues on MS Lending’s online application.
                    </p>
                  </div>
                )}
                <div className={sectionCls}>
                  <h2 className="mb-5 text-sm font-semibold text-navy-900">Your loan journey</h2>
                  <ol className="space-y-0">
                    {PORTAL_STAGES.map((s, i) => {
                      const done = i < stageIdx || closed
                      const here = i === stageIdx && !closed
                      return (
                        <li key={s.label} className="relative flex gap-4 pb-6 last:pb-0">
                          {i < PORTAL_STAGES.length - 1 && <span className={cx('absolute left-[17px] top-9 h-[calc(100%-28px)] w-0.5 rounded', done ? 'bg-sage-300' : 'bg-slate-200')} />}
                          <span className={cx('z-10 grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-semibold', done && 'bg-sage-500 text-white', here && 'animate-softpulse bg-navy-800 text-white', !done && !here && 'bg-slate-100 text-slate-400')}>
                            {done ? <Check className="h-4 w-4" /> : i + 1}
                          </span>
                          <div className="pt-1.5">
                            <p className={cx('text-sm font-semibold', here ? 'text-navy-900' : done ? 'text-sage-700' : 'text-slate-400')}>
                              {s.label}
                              {here && <Badge cls="ml-2 bg-navy-100 text-navy-700">You are here</Badge>}
                            </p>
                            {here && <p className="mt-0.5 text-xs text-slate-500">{s.blurb}</p>}
                          </div>
                        </li>
                      )
                    })}
                  </ol>
                </div>
              </>
            )}

            {/* ---- DOCUMENTS ---- */}
            {tab === 'documents' && (
              <>
                {!closed && missing.length > 0 && (
                  <div className={sectionCls}>
                    <h2 className="text-sm font-semibold text-navy-900">We still need a few things</h2>
                    <p className="mt-1 text-xs text-slate-500">A photo from your phone works great — no scanner needed.</p>
                    <DropZone className="mt-4" onFiles={onDrop} label="Drop a photo or PDF here" hint="or tap to choose from your phone" />
                    <ul className="mt-4 space-y-2.5">
                      {missing.map((doc) => (
                        <li key={doc.name} className="flex items-center justify-between gap-3 rounded-2xl bg-teal-50/60 px-4 py-3 ring-1 ring-teal-100">
                          <div>
                            <span className="text-sm font-medium text-slate-700">{doc.name}</span>
                            {doc.status === 'Rejected' && <p className="text-xs text-rose-500">We need a clearer copy of this one</p>}
                          </div>
                          <Btn variant="sage" className="!px-3 !py-1.5 text-xs" onClick={() => upload(doc.name)}>
                            <Upload className="h-3.5 w-3.5" /> Upload
                          </Btn>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {received.length > 0 && (
                  <div className={sectionCls}>
                    <h2 className="mb-4 text-sm font-semibold text-navy-900">What you’ve sent us</h2>
                    <ul className="space-y-2.5">
                      {received.map((doc) => (
                        <li key={doc.name} className="flex items-center gap-3">
                          <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-sage-100 text-sage-600"><Check className="h-3.5 w-3.5" /></span>
                          <span className="min-w-0 flex-1 text-sm text-slate-700">{doc.name}</span>
                          <span className="text-xs text-slate-400">{FRIENDLY_DOC_STATUS[doc.status]}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}

            {/* ---- VAULT ---- */}
            {tab === 'vault' && <Vault b={b} viewerName={identity.name} canEdit={isOwner} closed={closed} />}

            {/* ---- CHAT ---- */}
            {tab === 'chat' && <GroupChat b={b} officer={officer} viewer={identity} shares={sharesFor} />}

            {/* ---- SHARE ---- */}
            {tab === 'share' && <ShareManager b={b} />}
          </div>
        </div>

        {/* legal — customers must see this, every time */}
        <LegalDisclaimer className="mt-6" />

        {/* footer */}
        <div className="space-y-1.5 pb-4 pt-3 text-center">
          <p className="flex items-center justify-center gap-1.5 text-xs text-slate-400">
            <ShieldCheck className="h-3.5 w-3.5 text-sage-500" /> Your information stays private and secure.
          </p>
          <p className="text-[10px] text-slate-300">{DISCLAIMER}</p>
          <PoweredBySolvyr className="pt-1" />
        </div>
      </div>
    </div>
  )
}
