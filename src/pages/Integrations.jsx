import { useCallback, useEffect, useState } from 'react'
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
  Copy,
  ArrowRight,
  Globe,
  Search as SearchIcon,
  Loader2,
  RefreshCw,
  ServerCog,
  Unplug,
  Plus,
  Pencil,
  Trash2,
  FileText,
} from 'lucide-react'
import { useApp } from '../store.jsx'
import { INTEGRATIONS, INTEGRATION_CATEGORIES, OFFICERS, applyLinkFor } from '../data.js'
import BackendSetupDialog from '../components/BackendSetupDialog.jsx'
import { disconnectIntegrationBackend, integrationBackendStatus } from '../api.js'
import {
  PageHeader,
  Card,
  Btn,
  LinkBtn,
  Badge,
  Avatar,
  FilterChip,
  SearchInput,
  EmptyState,
  Modal,
  Field,
  inputCls,
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

/* ---------- a single integration card ---------- */
function IntegrationCard({ integration, state, onSetup, onDisconnect, busy }) {
  const adapterReady = !!state
  const configured = !!state?.appConfigured
  const connected = !!state?.connected
  const oauth = state?.authType === 'oauth2'
  const liveOAuth = oauth && connected
  const status = liveOAuth ? 'Connected' : configured ? (oauth ? 'Ready to authorize' : 'Server configured') : adapterReady ? 'Needs credentials' : 'Backend unavailable'
  return (
    <article className={cx('flex flex-col rounded-xl border bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)] dark:bg-white/[0.03]', liveOAuth ? 'border-sage-300/80 dark:border-sage-500/30' : 'border-slate-200/80 dark:border-white/10')}>
      <div className="flex items-start gap-3">
        <BrandChip integration={integration} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-semibold text-navy-950">{integration.name}</p>
            <Badge cls={liveOAuth ? 'bg-sage-50 text-sage-700 ring-sage-600/20' : configured ? 'bg-navy-100 text-navy-700 dark:bg-white/10 dark:text-white' : 'bg-amber-50 text-amber-700 ring-amber-600/20'}>
              {liveOAuth ? 'Live' : configured ? 'Backend ready' : 'Adapter ready'}
            </Badge>
          </div>
          <p className="mt-1 text-xs leading-snug text-slate-500">{integration.blurb}</p>
        </div>
      </div>

      <div className="mt-3 flex-1 space-y-1">
        {(state?.actions || []).slice(0, 3).map((action) => <p key={action} className="font-mono text-[10px] text-slate-400">{action}</p>)}
      </div>

      {state?.approval && <p className="mt-3 rounded-md bg-amber-50 px-2 py-1.5 text-[10px] leading-snug text-amber-700 dark:bg-amber-500/10 dark:text-amber-200">{state.approval}</p>}

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 dark:border-white/10">
        <span className={cx('text-xs font-medium', liveOAuth ? 'text-sage-700' : configured ? 'text-navy-700 dark:text-slate-200' : 'text-amber-700')}>{status}</span>
        <div className="flex gap-1.5">
          <Btn variant="outline" sm onClick={() => onSetup(integration)}>Setup</Btn>
          {oauth && configured && !connected && <LinkBtn href={state.connectUrl} variant="sage" sm>Connect</LinkBtn>}
          {oauth && connected && state.tokenSource === 'browser' && (
            <Btn variant="ghost" sm disabled={busy === integration.id} onClick={() => onDisconnect(integration.id)}>
              {busy === integration.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Unplug className="h-3 w-3" />} Disconnect
            </Btn>
          )}
        </div>
      </div>
    </article>
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
  const linkOfficers = OFFICERS

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

/* ---------- email templates: the library, editable & extendable ---------- */
const templateTextareaCls =
  'w-full rounded-lg border border-slate-300/70 bg-white px-3 py-2 text-[13px] leading-relaxed text-slate-700 transition-colors placeholder:text-slate-400 hover:border-slate-400/80 focus:border-navy-500 focus:outline-none focus:ring-2 focus:ring-navy-500/15 resize-y dark:border-white/10 dark:bg-navy-950 dark:text-slate-100'

function TemplateEditor({ template, onClose }) {
  const { addTemplate, updateTemplate } = useApp()
  const editing = !!template?.id
  const [form, setForm] = useState({ name: template?.name ?? '', subject: template?.subject ?? '', body: template?.body ?? '' })
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }))
  const save = (e) => {
    e.preventDefault()
    if (!form.name.trim()) return
    if (editing) updateTemplate(template.id, form)
    else addTemplate(form)
    onClose()
  }
  return (
    <Modal open onClose={onClose} wide title={editing ? 'Edit template' : 'New template'} sub="Use {first} to drop in the borrower’s first name when you send.">
      <form onSubmit={save} className="space-y-4">
        <Field label="Template name *">
          <input autoFocus className={inputCls} placeholder="e.g. Appraisal ordered" value={form.name} onChange={(e) => set('name')(e.target.value)} />
        </Field>
        <Field label="Subject line">
          <input className={inputCls} placeholder="What the borrower sees in their inbox" value={form.subject} onChange={(e) => set('subject')(e.target.value)} />
        </Field>
        <Field label="Message">
          <textarea rows={9} className={templateTextareaCls} value={form.body} onChange={(e) => set('body')(e.target.value)} />
        </Field>
        <div className="flex justify-end gap-2">
          <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
          <Btn type="submit">{editing ? 'Save changes' : 'Add template'}</Btn>
        </div>
      </form>
    </Modal>
  )
}

function TemplatesPanel() {
  const { templates, deleteTemplate, toast } = useApp()
  const [editing, setEditing] = useState(null) // template (edit), {} (new), or null (closed)
  const copy = (t) => {
    try {
      navigator.clipboard?.writeText(t.body)
    } catch {
      /* clipboard may be blocked; demo only */
    }
    toast('Template copied', '📋')
  }
  const iconBtn = 'rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-navy-900 dark:hover:bg-white/10 dark:hover:text-white'
  return (
    <>
      <Card className="mb-4" pad={false}>
        <div className="flex flex-wrap items-center gap-3 px-5 py-4">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-navy-100 text-navy-700 dark:bg-white/10 dark:text-white"><FileText className="h-5 w-5" /></span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-navy-950 dark:text-white">Email templates</p>
            <p className="text-xs text-slate-400">{templates.length} ready to send · type <span className="font-mono">{'{first}'}</span> to drop in a borrower’s name</p>
          </div>
          <Btn onClick={() => setEditing({})}><Plus className="h-3.5 w-3.5" /> New template</Btn>
        </div>
      </Card>

      {templates.length === 0 ? (
        <div className="rounded-xl border border-slate-200/80 bg-white dark:border-white/10 dark:bg-navy-900">
          <EmptyState icon={FileText} title="No templates yet" sub="Create one to reuse your best emails." />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {templates.map((t) => (
            <article key={t.id} className="flex flex-col rounded-xl border border-slate-200/80 bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)] dark:border-white/10 dark:bg-navy-900">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-navy-950 dark:text-white">{t.name}</p>
                  {t.subject && <p className="mt-0.5 truncate text-xs text-slate-400">{t.subject}</p>}
                </div>
                <div className="flex shrink-0 items-center gap-0.5">
                  <button onClick={() => copy(t)} title="Copy message" aria-label="Copy message" className={iconBtn}><Copy className="h-3.5 w-3.5" /></button>
                  <button onClick={() => setEditing(t)} title="Edit template" aria-label="Edit template" className={iconBtn}><Pencil className="h-3.5 w-3.5" /></button>
                  <button onClick={() => deleteTemplate(t.id)} title="Delete template" aria-label="Delete template" className={cx(iconBtn, 'hover:text-rose-600')}><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              </div>
              <p className="mt-3 line-clamp-4 flex-1 whitespace-pre-line text-[13px] leading-relaxed text-slate-600 dark:text-slate-300">{t.body}</p>
              <div className="mt-3 flex justify-end border-t border-slate-100 pt-3 dark:border-white/10">
                <Btn variant="outline" sm onClick={() => setEditing(t)}><Pencil className="h-3 w-3" /> Edit template</Btn>
              </div>
            </article>
          ))}
        </div>
      )}

      {editing && <TemplateEditor template={editing.id ? editing : null} onClose={() => setEditing(null)} />}
    </>
  )
}

export default function Integrations() {
  const { refreshConnections, toast } = useApp()
  const [tab, setTab] = useState('connectors')
  const [cat, setCat] = useState('All')
  const [q, setQ] = useState('')
  const [backend, setBackend] = useState(null)
  const [setup, setSetup] = useState(null)
  const [busy, setBusy] = useState(null)
  const query = q.trim().toLowerCase()

  const loadBackend = useCallback(async () => {
    setBackend(await integrationBackendStatus({ refresh: true }))
    await refreshConnections(false)
  }, [refreshConnections])
  useEffect(() => {
    loadBackend()
    const params = new URLSearchParams(window.location.search)
    const connected = params.get('connected') === '1' ? params.get('integration') : null
    if (connected) {
      toast(`${connected} connected successfully`, '✓')
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [loadBackend, toast])

  const disconnect = async (provider) => {
    setBusy(provider)
    try {
      await disconnectIntegrationBackend(provider)
      await loadBackend()
      toast(`${provider} disconnected`, '✓')
    } catch (error) {
      toast(error.message || 'Could not disconnect integration', '⚠')
    } finally {
      setBusy(null)
    }
  }

  const visible = INTEGRATIONS.filter((it) => {
    if (cat !== 'All' && it.category !== cat) return false
    if (query && !`${it.name} ${it.blurb} ${it.category}`.toLowerCase().includes(query)) return false
    return true
  })

  const categories = cat === 'All' ? INTEGRATION_CATEGORIES : [cat]

  return (
    <div>
      <PageHeader
        title="Connect your tools"
        sub="Connect the apps your team already lives in — and keep a library of ready-to-send emails."
      />

      {/* page tabs */}
      <div className="mb-5 flex gap-1 border-b border-slate-200 dark:border-white/10">
        {[['connectors', 'Integrations'], ['templates', 'Templates']].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={cx(
              '-mb-px border-b-2 px-3 py-2 text-[13px] font-medium transition-colors',
              tab === key ? 'border-navy-900 text-navy-950 dark:border-white dark:text-white' : 'border-transparent text-slate-400 hover:text-navy-900 dark:hover:text-white',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'templates' ? (
        <TemplatesPanel />
      ) : (
      <>
      <Card className="mb-4" pad={false}>
        <div className="flex flex-wrap items-center gap-3 px-5 py-4">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-navy-100 text-navy-700 dark:bg-white/10 dark:text-white"><ServerCog className="h-5 w-5" /></span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-navy-950 dark:text-white">Integration backend</p>
            <p className="text-xs text-slate-400">{backend?.available ? `${Object.keys(backend.connectors || {}).length} adapters loaded · ${backend.runtime} runtime` : 'Checking the local API runtime…'}</p>
          </div>
          {backend ? (
            <Badge cls={backend.available ? 'bg-sage-50 text-sage-700 ring-sage-600/20' : 'bg-rose-50 text-rose-700 ring-rose-600/20'}>{backend.available ? 'API online' : 'API unavailable'}</Badge>
          ) : <Loader2 className="h-4 w-4 animate-spin text-slate-400" />}
          <Btn variant="ghost" sm aria-label="Refresh connector status" onClick={loadBackend}><RefreshCw className="h-3.5 w-3.5" /></Btn>
        </div>
      </Card>

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
                      state={backend?.connectors?.[it.id]}
                      onSetup={setSetup}
                      onDisconnect={disconnect}
                      busy={busy}
                    />
                  ))}
                </div>
              </section>
            )
          })}
        </div>
      )}

      <div className="mt-6">
        <WebsiteApplyCard />
      </div>
      </>
      )}

      {setup && (
        <BackendSetupDialog
          integration={setup}
          connectorState={backend?.connectors?.[setup.id]}
          onClose={() => setSetup(null)}
        />
      )}

    </div>
  )
}
