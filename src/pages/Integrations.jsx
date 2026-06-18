import { useEffect, useRef, useState } from 'react'
import {
  Mail,
  Calendar,
  Megaphone,
  Camera,
  Briefcase,
  Home,
  MapPin,
  MessageSquare,
  MessageCircle,
  Phone,
  PenTool,
  Cloud,
  Zap,
  Calculator,
  Send,
  Plug,
  Check,
  CheckCircle2,
  ShieldCheck,
  Loader2,
  Link2,
  Copy,
  ArrowRight,
  Globe,
  Search as SearchIcon,
} from 'lucide-react'
import { useApp } from '../store.jsx'
import { INTEGRATIONS, INTEGRATION_CATEGORIES, OFFICERS, applyLinkFor, fmtDate } from '../data.js'
import {
  PageHeader,
  Card,
  Btn,
  Badge,
  Avatar,
  Modal,
  Field,
  FilterChip,
  SearchInput,
  inputCls,
  EmptyState,
  cx,
} from '../ui.jsx'

/* string → Lucide icon (keeps data.js free of JSX imports).
   Exported so the sidebar can render the same brand glyphs. */
export const INTEGRATION_ICONS = {
  mail: Mail,
  calendar: Calendar,
  megaphone: Megaphone,
  camera: Camera,
  briefcase: Briefcase,
  home: Home,
  mapPin: MapPin,
  messageSquare: MessageSquare,
  messageCircle: MessageCircle,
  phone: Phone,
  penTool: PenTool,
  cloud: Cloud,
  zap: Zap,
  calculator: Calculator,
  send: Send,
}

const ACCOUNT_LABEL = {
  email: 'Account email',
  page: 'Page name',
  handle: 'Profile / handle',
  phone: 'Phone number',
  account: 'Account',
}

/* translucent brand-tint background from a hex color */
const tint = (hex, alpha = '20') => hex + alpha

function BrandChip({ integration, size = 'h-11 w-11', icon = 'h-5 w-5' }) {
  const Icon = INTEGRATION_ICONS[integration.icon] ?? Plug
  return (
    <span
      className={cx('grid shrink-0 place-items-center rounded-xl', size)}
      style={{ backgroundColor: tint(integration.color) }}
    >
      <Icon className={icon} style={{ color: integration.color }} strokeWidth={2} />
    </span>
  )
}

/* ---------- connect / manage dialog ---------- */
function ConnectDialog({ integration, connected, onClose }) {
  const { connectIntegration, disconnectIntegration } = useApp()
  const [account, setAccount] = useState(connected?.account ?? integration.defaultAccount)
  const [working, setWorking] = useState(false)
  const alive = useRef(true)
  useEffect(() => () => { alive.current = false }, [])

  const authorize = (e) => {
    e.preventDefault()
    setWorking(true)
    // simulate the OAuth round-trip
    setTimeout(() => {
      if (!alive.current) return
      connectIntegration(integration.id, account.trim() || integration.defaultAccount, integration.name)
      onClose()
    }, 1100)
  }

  /* already connected → manage view */
  if (connected) {
    return (
      <Modal open onClose={onClose} title={`Manage ${integration.name}`} sub="Connection details and access.">
        <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/60 p-3.5">
          <BrandChip integration={integration} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-navy-950">{connected.account}</p>
            <p className="text-xs text-slate-400">Connected since {fmtDate(connected.since)}</p>
          </div>
          <Badge cls="bg-sage-50 text-sage-700 ring-sage-600/20" dot="bg-sage-500">
            Active
          </Badge>
        </div>

        <p className="mt-4 mb-1.5 text-xs font-medium text-slate-600">What MS Lending can do</p>
        <ul className="space-y-1.5">
          {integration.perms.map((p) => (
            <li key={p} className="flex items-start gap-2 text-[13px] text-slate-600">
              <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-sage-600" strokeWidth={2.5} />
              {p}
            </li>
          ))}
        </ul>

        <div className="mt-5 flex items-center justify-between gap-2 border-t border-slate-100 pt-4">
          <button
            onClick={() => {
              disconnectIntegration(integration.id, integration.name)
              onClose()
            }}
            className="rounded-lg px-3 py-2 text-[13px] font-medium text-rose-600 transition-colors hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/40"
          >
            Disconnect
          </button>
          <Btn variant="outline" onClick={onClose}>
            Done
          </Btn>
        </div>
      </Modal>
    )
  }

  /* not connected → OAuth-style consent */
  return (
    <Modal open onClose={working ? () => {} : onClose} title={`Connect ${integration.name}`} sub="Authorize access to link your account.">
      <form onSubmit={authorize}>
        <div className="flex items-center justify-center gap-3 py-1">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-navy-900 text-white">
            <Plug className="h-5 w-5" strokeWidth={2} />
          </span>
          <Link2 className="h-4 w-4 text-slate-300" />
          <BrandChip integration={integration} size="h-12 w-12" icon="h-6 w-6" />
        </div>
        <p className="mt-3 text-center text-[13px] text-slate-500">
          <span className="font-medium text-navy-900">MS Lending</span> wants to connect to your{' '}
          <span className="font-medium text-navy-900">{integration.name}</span> account.
        </p>

        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/60 p-3.5">
          <p className="mb-1.5 text-xs font-medium text-slate-600">This will allow MS Lending to</p>
          <ul className="space-y-1.5">
            {integration.perms.map((p) => (
              <li key={p} className="flex items-start gap-2 text-[13px] text-slate-600">
                <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-sage-600" strokeWidth={2.5} />
                {p}
              </li>
            ))}
          </ul>
        </div>

        <Field label={ACCOUNT_LABEL[integration.accountKind] ?? 'Account'} className="mt-4">
          <input
            className={inputCls}
            value={account}
            onChange={(e) => setAccount(e.target.value)}
            disabled={working}
          />
        </Field>

        <p className="mt-3 flex items-center gap-1.5 text-[11px] text-slate-400">
          <ShieldCheck className="h-3.5 w-3.5 text-sage-500" />
          Demo connection — no real account is accessed or stored.
        </p>

        <div className="mt-5 flex justify-end gap-2">
          <Btn variant="ghost" onClick={onClose} disabled={working}>
            Cancel
          </Btn>
          <Btn type="submit" disabled={working} className="min-w-[8.5rem]">
            {working ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Connecting…
              </>
            ) : (
              <>
                <Link2 className="h-3.5 w-3.5" /> Authorize &amp; connect
              </>
            )}
          </Btn>
        </div>
      </form>
    </Modal>
  )
}

/* ---------- a single integration card ---------- */
function IntegrationCard({ integration, connected, onOpen }) {
  return (
    <div
      className={cx(
        'group flex flex-col rounded-xl border bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_10px_28px_-14px_rgba(16,24,40,0.22)]',
        connected ? 'border-sage-300/70' : 'border-slate-200/80',
      )}
    >
      <div className="flex items-start gap-3">
        <BrandChip integration={integration} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-semibold text-navy-950">{integration.name}</p>
            {connected && (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-sage-600" strokeWidth={2} />
            )}
          </div>
          <p className="mt-1 text-xs leading-snug text-slate-500">{integration.blurb}</p>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-100 pt-3">
        {connected ? (
          <span className="flex min-w-0 items-center gap-1.5 text-xs text-slate-500">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-sage-500" />
            <span className="truncate">{connected.account}</span>
          </span>
        ) : (
          <span className="text-xs text-slate-400">Not connected</span>
        )}
        {connected ? (
          <Btn variant="outline" sm onClick={() => onOpen(integration)}>
            Manage
          </Btn>
        ) : (
          <Btn variant="soft" sm onClick={() => onOpen(integration)}>
            <Link2 className="h-3 w-3" /> Connect
          </Btn>
        )}
      </div>
    </div>
  )
}

/* ---------- featured: route the website's Apply button ---------- */
function WebsiteApplyCard() {
  const { toast, seat } = useApp()
  const me = OFFICERS.find((o) => o.id === (seat === 'team' ? 'julene' : seat)) ?? OFFICERS[0]
  const [copied, setCopied] = useState(null)
  const copy = (id, url) => {
    try {
      navigator.clipboard?.writeText(url)
    } catch {
      /* clipboard may be blocked; demo only */
    }
    setCopied(id)
    toast('Apply link copied', '📋')
    setTimeout(() => setCopied(null), 1600)
  }
  const linkOfficers = OFFICERS.filter((o) => ['michelle', 'julene', 'lauren'].includes(o.id))

  return (
    <Card
      className="mb-4"
      title="Route your website’s Apply button"
      sub="Capture every lead in the workspace before they reach the long application."
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {/* before */}
        <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3.5">
          <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Today</p>
          <div className="flex items-center gap-2 text-[11px]">
            <span className="rounded-lg border border-slate-200 bg-white px-2 py-1 font-medium text-navy-900">Apply Now</span>
            <ArrowRight className="h-3.5 w-3.5 shrink-0 text-slate-300" />
            <span className="truncate rounded-lg border border-slate-200 bg-white px-2 py-1 font-mono text-slate-500">my1003app.com</span>
          </div>
          <p className="mt-2.5 text-xs leading-relaxed text-slate-500">
            If they don’t finish the 10-minute form, the lead is gone — you never knew they came.
          </p>
        </div>
        {/* after */}
        <div className="rounded-xl border border-sage-200 bg-sage-50/60 p-3.5">
          <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-wide text-sage-600">With the workspace</p>
          <div className="flex items-center gap-2 text-[11px]">
            <span className="rounded-lg border border-sage-200 bg-white px-2 py-1 font-medium text-navy-900">Apply Now</span>
            <ArrowRight className="h-3.5 w-3.5 shrink-0 text-sage-400" />
            <span className="rounded-lg border border-sage-300 bg-sage-100 px-2 py-1 font-medium text-sage-800">capture</span>
            <ArrowRight className="h-3.5 w-3.5 shrink-0 text-sage-400" />
            <span className="truncate rounded-lg border border-sage-200 bg-white px-2 py-1 font-mono text-slate-500">1003</span>
          </div>
          <p className="mt-2.5 text-xs leading-relaxed text-sage-800">
            The lead is captured first — you follow up even if they don’t finish.
          </p>
        </div>
      </div>

      {/* per-officer links */}
      <p className="mb-2 mt-4 text-xs font-medium text-slate-500">Each officer’s capture link</p>
      <ul className="space-y-1.5">
        {linkOfficers.map((o) => {
          const url = 'https://' + applyLinkFor(o)
          return (
            <li key={o.id} className="flex items-center gap-2.5 rounded-lg border border-slate-200 bg-white px-3 py-2">
              <Avatar officer={o} size="h-6 w-6 text-[9px]" />
              <span className="w-16 shrink-0 truncate text-xs text-slate-500">{o.name.split(' ')[0]}</span>
              <span className="min-w-0 flex-1 truncate font-mono text-[12px] text-navy-900">{applyLinkFor(o)}</span>
              <Btn variant="outline" sm onClick={() => copy(o.id, url)}>
                {copied === o.id ? <Check className="h-3.5 w-3.5 text-sage-600" /> : <Copy className="h-3.5 w-3.5" />}
              </Btn>
            </li>
          )
        })}
      </ul>

      {/* the one-line change */}
      <div className="mt-3 overflow-x-auto rounded-lg bg-navy-950 p-3 font-mono text-[11px] leading-relaxed">
        <p className="text-rose-300">- &lt;a href="https://mslending.my1003app.com/102016"&gt;Apply Now&lt;/a&gt;</p>
        <p className="text-sage-300">+ &lt;a href="https://{applyLinkFor(me)}"&gt;Apply Now&lt;/a&gt;</p>
      </div>
    </Card>
  )
}

export default function Integrations() {
  const { connections, emailReady, go } = useApp()
  const [cat, setCat] = useState('All')
  const [q, setQ] = useState('')
  const [dialog, setDialog] = useState(null) // the integration being connected/managed

  const connectedCount = Object.keys(connections).length
  const query = q.trim().toLowerCase()

  const visible = INTEGRATIONS.filter((it) => {
    if (cat !== 'All' && it.category !== cat) return false
    if (query && !`${it.name} ${it.blurb} ${it.category}`.toLowerCase().includes(query)) return false
    return true
  })

  const categories = cat === 'All' ? INTEGRATION_CATEGORIES : [cat]

  return (
    <div>
      <PageHeader
        title="Integrations"
        sub="Email sends for real once connected. The rest are on the roadmap — marked live only when they actually work."
        actions={
          emailReady ? (
            <Badge cls="bg-sage-50 text-sage-700 ring-sage-600/20" dot="bg-sage-500">Email live</Badge>
          ) : (
            <Badge cls="bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-slate-300">Email not connected</Badge>
          )
        }
      />

      {/* straight talk about what's live */}
      <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-amber-200/70 bg-amber-50 p-3 text-xs leading-relaxed text-amber-800 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-200">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
        <span>
          <span className="font-semibold">Straight talk:</span> only <span className="font-semibold">Email</span> is a live
          connection today. The tools further down are placeholders for the production plan — they don’t send or receive yet,
          and we won’t pretend otherwise.
        </span>
      </div>

      {/* the one real connection */}
      <Card className="mb-4" title="Email — your live connection" sub="Really sends from your own address. No password stored here.">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl" style={{ backgroundColor: '#EA433520' }}>
              <Mail className="h-5 w-5" style={{ color: '#EA4335' }} strokeWidth={2} />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-navy-950 dark:text-white">Send real email to borrowers & agents</p>
              <p className="text-xs text-slate-400">Powered by EmailJS — connect once in Settings</p>
            </div>
          </div>
          {emailReady ? (
            <Badge cls="bg-sage-50 text-sage-700 ring-sage-600/20" dot="bg-sage-500">Live ✓</Badge>
          ) : (
            <Btn variant="sage" onClick={() => go('settings')}>
              <Plug className="h-3.5 w-3.5" /> Connect email
            </Btn>
          )}
        </div>
      </Card>

      {/* featured: website apply-button routing */}
      <WebsiteApplyCard />

      {/* connected spotlight */}
      {connectedCount > 0 && (
        <Card
          className="mb-4"
          title="Sample connections (not live)"
          sub="Illustrating the production plan — these don’t send or receive yet."
        >
          <div className="flex flex-wrap gap-2">
            {INTEGRATIONS.filter((it) => connections[it.id]).map((it) => (
              <button
                key={it.id}
                onClick={() => setDialog(it)}
                className="group flex items-center gap-2 rounded-full border border-slate-200/80 bg-white py-1 pl-1 pr-3 text-xs font-medium text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-500/40"
              >
                <BrandChip integration={it} size="h-6 w-6" icon="h-3.5 w-3.5" />
                {it.name}
                <span className="h-1.5 w-1.5 rounded-full bg-sage-500" />
              </button>
            ))}
          </div>
        </Card>
      )}

      {/* filters */}
      <div className="mb-4 space-y-2.5">
        <SearchInput
          value={q}
          onChange={setQ}
          placeholder="Search integrations"
          className="w-full sm:w-72"
        />
        <div className="flex flex-wrap gap-1.5">
          <FilterChip active={cat === 'All'} onClick={() => setCat('All')}>
            All
          </FilterChip>
          {INTEGRATION_CATEGORIES.map((c) => (
            <FilterChip key={c} active={cat === c} onClick={() => setCat(c)}>
              {c}
            </FilterChip>
          ))}
        </div>
      </div>

      {/* grouped grid */}
      {visible.length === 0 ? (
        <div className="rounded-xl border border-slate-200/80 bg-white">
          <EmptyState icon={SearchIcon} title="No integrations found" sub="Try a different search or category." />
        </div>
      ) : (
        <div className="space-y-6">
          {categories.map((c) => {
            const items = visible.filter((it) => it.category === c)
            if (items.length === 0) return null
            return (
              <section key={c}>
                <h2 className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-slate-400">{c}</h2>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {items.map((it) => (
                    <IntegrationCard
                      key={it.id}
                      integration={it}
                      connected={connections[it.id]}
                      onOpen={setDialog}
                    />
                  ))}
                </div>
              </section>
            )
          })}
        </div>
      )}

      {dialog && (
        <ConnectDialog
          integration={dialog}
          connected={connections[dialog.id]}
          onClose={() => setDialog(null)}
        />
      )}
    </div>
  )
}
