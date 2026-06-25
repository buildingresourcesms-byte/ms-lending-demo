import { useMemo, useState } from 'react'
import {
  Users,
  Image as ImageIcon,
  FileText,
  Share2,
  Globe,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Download,
  Trash2,
  X,
  Upload,
  Megaphone,
  Camera,
  Briefcase,
  Link2,
  ExternalLink,
  Sparkles,
} from 'lucide-react'
import { useApp } from '../store.jsx'
import { parseCsv, downloadCsv } from '../csv.js'
import { LOAN_TYPES, STATUSES, SOURCES, OFFICERS, applyLinkFor, officerById } from '../data.js'
import { PageHeader, Card, Btn, Select, Field, DropZone, Badge, EmptyState, inputCls, cx } from '../ui.jsx'

/* ---------- helpers ---------- */
const formatBytes = (n) => {
  if (!n) return '0 KB'
  const kb = n / 1024
  return kb < 1024 ? `${Math.max(1, Math.round(kb))} KB` : `${(kb / 1024).toFixed(1)} MB`
}

const FIELDS = [
  { key: 'name', label: 'Full name', required: true },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Phone' },
  { key: 'loanType', label: 'Loan type' },
  { key: 'purpose', label: 'Purpose' },
  { key: 'amount', label: 'Loan amount' },
  { key: 'city', label: 'City' },
  { key: 'status', label: 'Pipeline status' },
  { key: 'source', label: 'Lead source' },
]
const MAP_HINTS = {
  name: ['name', 'client', 'borrower', 'full name', 'contact', 'customer'],
  email: ['email', 'e-mail', 'mail'],
  phone: ['phone', 'mobile', 'cell', 'tel', 'number'],
  loanType: ['loan type', 'type', 'product', 'program'],
  purpose: ['purpose', 'transaction', 'loan purpose'],
  amount: ['amount', 'loan amount', 'price', 'value', 'balance'],
  city: ['city', 'town', 'municipality'],
  status: ['status', 'stage', 'pipeline'],
  source: ['source', 'lead source', 'origin', 'referral', 'channel'],
}
const guessMapping = (headers) => {
  const norm = headers.map((h) => h.toLowerCase().trim())
  const out = {}
  for (const f of FIELDS) {
    const hints = MAP_HINTS[f.key] || []
    let idx = norm.findIndex((h) => hints.some((k) => h === k))
    if (idx < 0) idx = norm.findIndex((h) => hints.some((k) => h.includes(k)))
    out[f.key] = idx >= 0 ? String(idx) : ''
  }
  return out
}

/* ============================================================
   CLIENTS — the real one. Drop a CSV (Excel "Save as CSV", or an
   export from your old system), map the columns, preview, import.
   ============================================================ */
function ClientsPanel({ onBack }) {
  const { importBorrowers, borrowers, seat, go, toast } = useApp()
  const [step, setStep] = useState(1)
  const [fileName, setFileName] = useState('')
  const [parsed, setParsed] = useState({ headers: [], rows: [] })
  const [mapping, setMapping] = useState({})
  const [officerId, setOfficerId] = useState(seat === 'team' ? 'julene' : seat)

  const onFiles = async (files) => {
    const file = [...files].find((f) => /\.csv$/i.test(f.name)) || files[0]
    if (!file) return
    try {
      const text = await file.text()
      const result = parseCsv(text)
      if (!result.headers.length) {
        toast('That file looks empty — check the export and try again', '⚠️')
        return
      }
      setParsed(result)
      setFileName(file.name)
      setMapping(guessMapping(result.headers))
      setStep(2)
    } catch {
      toast('Couldn’t read that file — is it a .csv?', '⚠️')
    }
  }

  const headerOptions = useMemo(
    () => [{ value: '', label: '— skip —' }, ...parsed.headers.map((h, i) => ({ value: String(i), label: h || `Column ${i + 1}` }))],
    [parsed.headers],
  )

  const builtRows = useMemo(
    () =>
      parsed.rows.map((r) =>
        Object.fromEntries(FIELDS.map((f) => [f.key, mapping[f.key] !== '' && mapping[f.key] != null ? (r[Number(mapping[f.key])] ?? '') : ''])),
      ),
    [parsed.rows, mapping],
  )
  const importable = builtRows.filter((r) => (r.name || '').trim())
  const nameMapped = mapping.name !== '' && mapping.name != null

  const downloadSample = () =>
    downloadCsv(
      'ms-lending-import-template.csv',
      ['Name', 'Email', 'Phone', 'Loan Type', 'Purpose', 'Loan Amount', 'City', 'Status', 'Source'],
      [
        ['Monica Hayes', 'monica@example.com', '(601) 555-0190', 'Conventional', 'Purchase', '275000', 'Madison', 'New Lead', 'Past Client'],
        ['Greg Tate', 'greg@example.com', '(601) 555-0191', 'FHA', 'Purchase', '198000', 'Brandon', 'Contacted', 'Zillow'],
      ],
    )

  const doImport = () => {
    const n = importBorrowers(importable, { officerId })
    if (n) go('borrowers')
  }

  return (
    <div>
      <button onClick={onBack} className="mb-3 inline-flex items-center gap-1.5 text-[13px] font-medium text-slate-500 transition-colors hover:text-navy-900 dark:hover:text-white">
        <ArrowLeft className="h-4 w-4" /> All imports
      </button>
      <PageHeader title="Import clients & leads" sub="Your whole pipeline, in one upload. Map your columns once — we’ll do the rest." />

      {/* stepper */}
      <div className="mb-5 flex items-center gap-2">
        {[[1, 'Upload'], [2, 'Match columns'], [3, 'Review & import']].map(([n, label], i) => (
          <div key={n} className="flex flex-1 items-center gap-2">
            <span className={cx('grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] font-semibold', step >= n ? 'bg-navy-900 text-white dark:bg-white/15' : 'bg-slate-100 text-slate-400 dark:bg-white/10')}>
              {step > n ? <Check className="h-3.5 w-3.5" /> : n}
            </span>
            <span className={cx('text-xs font-medium', step >= n ? 'text-navy-900 dark:text-white' : 'text-slate-400')}>{label}</span>
            {i < 2 && <span className="h-px flex-1 bg-slate-200 dark:bg-white/10" />}
          </div>
        ))}
      </div>

      {step === 1 && (
        <Card>
          <DropZone
            accept=".csv,text/csv"
            onFiles={onFiles}
            label="Drop your client CSV here"
            hint="or tap to choose a file"
          />
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-4 dark:border-white/10">
            <p className="text-xs text-slate-500">
              Exporting from <span className="font-medium text-slate-700 dark:text-slate-300">Excel</span> or your old system? Save the sheet as <span className="font-medium">CSV</span> first, then drop it here.
            </p>
            <Btn variant="outline" sm onClick={downloadSample}>
              <Download className="h-3.5 w-3.5" /> Download a template
            </Btn>
          </div>
        </Card>
      )}

      {step === 2 && (
        <Card title={`Match the columns in ${fileName}`} sub={`${parsed.rows.length} row${parsed.rows.length === 1 ? '' : 's'} found · we guessed where we could`}>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {FIELDS.map((f) => (
              <Field key={f.key} label={f.required ? `${f.label} *` : f.label}>
                <Select value={mapping[f.key] ?? ''} onChange={(v) => setMapping((m) => ({ ...m, [f.key]: v }))} options={headerOptions} />
              </Field>
            ))}
          </div>
          <div className="mt-4 border-t border-slate-100 pt-4 dark:border-white/10">
            <Field label="Assign all imported clients to">
              <Select value={officerId} onChange={setOfficerId} options={OFFICERS.map((o) => ({ value: o.id, label: o.name }))} className="sm:w-64" />
            </Field>
            <p className="mt-1.5 text-[11px] text-slate-400">Loan type, purpose, and status fall back to sensible defaults when a value doesn’t match.</p>
          </div>
          <div className="mt-5 flex items-center justify-between gap-2">
            <Btn variant="ghost" onClick={() => setStep(1)}><ArrowLeft className="h-4 w-4" /> Back</Btn>
            <Btn onClick={() => setStep(3)} disabled={!nameMapped}>Preview {importable.length} client{importable.length === 1 ? '' : 's'} <ArrowRight className="h-4 w-4" /></Btn>
          </div>
          {!nameMapped && <p className="mt-2 text-right text-[11px] font-medium text-amber-600">Map a column to “Full name” to continue.</p>}
        </Card>
      )}

      {step === 3 && (
        <Card title="Review & import" sub={`${importable.length} client${importable.length === 1 ? '' : 's'} ready · rows without a name are skipped`}>
          <div className="overflow-x-auto rounded-lg border border-slate-200/80 dark:border-white/10">
            <table className="w-full text-left text-[13px]">
              <thead>
                <tr className="border-b border-slate-200/70 bg-slate-50/60 text-xs font-medium text-slate-500 dark:border-white/10 dark:bg-white/5">
                  <th className="px-3 py-2 font-medium">Name</th>
                  <th className="px-3 py-2 font-medium">Email</th>
                  <th className="px-3 py-2 font-medium">Phone</th>
                  <th className="px-3 py-2 font-medium">Loan</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/10">
                {importable.slice(0, 8).map((r, i) => (
                  <tr key={i}>
                    <td className="px-3 py-2 font-medium text-navy-950 dark:text-white">{r.name}</td>
                    <td className="px-3 py-2 text-slate-500">{r.email || '—'}</td>
                    <td className="px-3 py-2 text-slate-500">{r.phone || '—'}</td>
                    <td className="px-3 py-2 text-slate-500">{r.loanType || 'Conventional'}{r.amount ? ` · ${r.amount}` : ''}</td>
                    <td className="px-3 py-2 text-slate-500">{STATUSES.includes(r.status) ? r.status : 'New Lead'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {importable.length > 8 && <p className="mt-2 text-xs text-slate-400">…and {importable.length - 8} more.</p>}
          <div className="mt-5 flex items-center justify-between gap-2">
            <Btn variant="ghost" onClick={() => setStep(2)}><ArrowLeft className="h-4 w-4" /> Back to mapping</Btn>
            <Btn variant="sage" onClick={doImport} disabled={!importable.length}><Check className="h-4 w-4" /> Import {importable.length} client{importable.length === 1 ? '' : 's'}</Btn>
          </div>
        </Card>
      )}

      <p className="mt-4 text-center text-xs text-slate-400">You have {borrowers.length} client{borrowers.length === 1 ? '' : 's'} in your workspace today.</p>
    </div>
  )
}

/* ============================================================
   PHOTO LIBRARY — drop images, see a clean grid. (Demo: held for
   this session; real hosting keeps them for good.)
   ============================================================ */
function PhotosPanel({ photos, setPhotos, onBack }) {
  const [zoom, setZoom] = useState(null)
  const add = (files) => {
    const imgs = [...files].filter((f) => f.type.startsWith('image/'))
    if (!imgs.length) return
    setPhotos((p) => [...imgs.map((f) => ({ id: crypto.randomUUID?.() ?? String(Math.random()), name: f.name, url: URL.createObjectURL(f), size: f.size })), ...p])
  }
  const remove = (ph) => {
    URL.revokeObjectURL(ph.url)
    setPhotos((p) => p.filter((x) => x.id !== ph.id))
  }
  return (
    <div>
      <button onClick={onBack} className="mb-3 inline-flex items-center gap-1.5 text-[13px] font-medium text-slate-500 transition-colors hover:text-navy-900 dark:hover:text-white">
        <ArrowLeft className="h-4 w-4" /> All imports
      </button>
      <PageHeader title="Photo library" sub="Property shots, headshots, marketing images — in one tidy place." />
      <DropZone className="mb-4" accept="image/*" onFiles={add} label="Drop photos here" hint="JPG, PNG, HEIC — or tap to choose" />
      {photos.length === 0 ? (
        <div className="rounded-xl border border-slate-200/80 bg-white dark:border-white/10 dark:bg-navy-900">
          <EmptyState icon={ImageIcon} title="No photos yet" sub="Add a few to start your library." />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {photos.map((ph) => (
              <figure key={ph.id} className="group relative overflow-hidden rounded-xl border border-slate-200/80 bg-slate-50 dark:border-white/10">
                <button onClick={() => setZoom(ph)} className="block aspect-square w-full">
                  <img src={ph.url} alt={ph.name} className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105" />
                </button>
                <button onClick={() => remove(ph)} title="Remove" aria-label={`Remove ${ph.name}`} className="absolute right-1.5 top-1.5 rounded-md bg-white/90 p-1 text-slate-500 opacity-0 shadow-sm transition-opacity hover:text-rose-600 group-hover:opacity-100">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
                <figcaption className="truncate px-2 py-1.5 text-[11px] text-slate-500">{ph.name}</figcaption>
              </figure>
            ))}
          </div>
          <p className="mt-3 text-xs text-slate-400">Held for this preview session. With hosting, your library is saved for good.</p>
        </>
      )}
      {zoom && (
        <div className="fixed inset-0 z-[70] grid place-items-center bg-navy-950/70 p-6" onClick={() => setZoom(null)}>
          <img src={zoom.url} alt={zoom.name} className="max-h-[85vh] max-w-[90vw] rounded-xl shadow-2xl" />
          <button onClick={() => setZoom(null)} className="absolute right-4 top-4 rounded-lg bg-white/10 p-2 text-white hover:bg-white/20"><X className="h-5 w-5" /></button>
        </div>
      )}
    </div>
  )
}

/* ============================================================
   DOCUMENTS — PDFs and files, in a simple list.
   ============================================================ */
function DocumentsPanel({ docs, setDocs, onBack }) {
  const add = (files) => {
    if (!files.length) return
    setDocs((d) => [...[...files].map((f) => ({ id: crypto.randomUUID?.() ?? String(Math.random()), name: f.name, url: URL.createObjectURL(f), size: f.size })), ...d])
  }
  const remove = (doc) => {
    URL.revokeObjectURL(doc.url)
    setDocs((d) => d.filter((x) => x.id !== doc.id))
  }
  return (
    <div>
      <button onClick={onBack} className="mb-3 inline-flex items-center gap-1.5 text-[13px] font-medium text-slate-500 transition-colors hover:text-navy-900 dark:hover:text-white">
        <ArrowLeft className="h-4 w-4" /> All imports
      </button>
      <PageHeader title="Documents" sub="Disclosures, statements, anything you keep as a file — bring them over." />
      <DropZone className="mb-4" accept=".pdf,application/pdf" onFiles={add} label="Drop PDFs or files here" hint="or tap to choose" />
      {docs.length === 0 ? (
        <div className="rounded-xl border border-slate-200/80 bg-white dark:border-white/10 dark:bg-navy-900">
          <EmptyState icon={FileText} title="No documents yet" sub="Add your first file to get started." />
        </div>
      ) : (
        <>
          <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200/80 bg-white dark:divide-white/10 dark:border-white/10 dark:bg-navy-900">
            {docs.map((doc) => (
              <li key={doc.id} className="flex items-center gap-3 px-4 py-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-rose-50 text-rose-500 dark:bg-rose-500/10"><FileText className="h-4 w-4" /></span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-medium text-slate-700 dark:text-slate-200">{doc.name}</span>
                  <span className="block text-[11px] text-slate-400">{formatBytes(doc.size)}</span>
                </span>
                <a href={doc.url} target="_blank" rel="noopener noreferrer" className="rounded-md px-2 py-1 text-xs font-medium text-navy-600 transition-colors hover:bg-slate-100 hover:text-navy-900 dark:text-slate-300 dark:hover:bg-white/10">Open</a>
                <button onClick={() => remove(doc)} title="Remove" aria-label={`Remove ${doc.name}`} className="rounded-md p-1 text-slate-300 transition-colors hover:bg-slate-50 hover:text-rose-500"><Trash2 className="h-3.5 w-3.5" /></button>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-slate-400">Held for this preview session. With hosting, your files are saved for good.</p>
        </>
      )}
    </div>
  )
}

/* ============================================================
   SOCIAL — connect accounts to pull posts + their metrics.
   ============================================================ */
const SOCIAL = [
  { id: 'facebook', name: 'Facebook', icon: Megaphone, color: '#1877F2' },
  { id: 'instagram', name: 'Instagram', icon: Camera, color: '#E4405F' },
  { id: 'linkedin', name: 'LinkedIn', icon: Briefcase, color: '#0A66C2' },
]
const SAMPLE_POSTS = [
  { platform: 'Facebook', text: 'Congrats to the Carter family — closed on their Madison home today! 🏡', likes: 84, comments: 12, shares: 7, reach: 2400, when: '2d ago' },
  { platform: 'Instagram', text: 'First-time buyer? Here’s exactly what to gather before you apply 👇', likes: 156, comments: 9, shares: 3, reach: 3100, when: '5d ago' },
  { platform: 'Facebook', text: 'Rates dipped this week — message us and we’ll run your numbers, no obligation.', likes: 41, comments: 6, shares: 2, reach: 1800, when: '1w ago' },
]
function SocialPanel({ onBack }) {
  const { connections, go } = useApp()
  return (
    <div>
      <button onClick={onBack} className="mb-3 inline-flex items-center gap-1.5 text-[13px] font-medium text-slate-500 transition-colors hover:text-navy-900 dark:hover:text-white">
        <ArrowLeft className="h-4 w-4" /> All imports
      </button>
      <PageHeader title="Social media" sub="Connect an account to bring your posts over — with their likes, comments, and reach." />
      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {SOCIAL.map((s) => {
          const connected = !!connections[s.id]
          const Icon = s.icon
          return (
            <div key={s.id} className="flex items-center gap-3 rounded-xl border border-slate-200/80 bg-white p-4 dark:border-white/10 dark:bg-navy-900">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl" style={{ backgroundColor: s.color + '20' }}><Icon className="h-5 w-5" style={{ color: s.color }} /></span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-navy-950 dark:text-white">{s.name}</p>
                <p className="text-xs text-slate-400">{connected ? 'Connected' : 'Not connected'}</p>
              </div>
              <Btn variant={connected ? 'outline' : 'primary'} sm onClick={() => go('integrations')}>
                {connected ? <><Check className="h-3.5 w-3.5" /> Manage</> : <><Link2 className="h-3.5 w-3.5" /> Connect</>}
              </Btn>
            </div>
          )
        })}
      </div>

      <Card title="What you’ll see once connected" sub="A preview of your imported posts and their performance.">
        <ul className="space-y-3">
          {SAMPLE_POSTS.map((p, i) => (
            <li key={i} className="rounded-xl border border-slate-200/70 bg-slate-50/50 p-3.5 dark:border-white/10 dark:bg-white/[0.02]">
              <div className="mb-1.5 flex items-center gap-2 text-[11px] font-medium text-slate-400">
                <span className="rounded bg-white px-1.5 py-0.5 ring-1 ring-slate-200 dark:bg-white/10 dark:ring-white/10">{p.platform}</span>
                {p.when}
              </div>
              <p className="text-[13px] leading-relaxed text-slate-700 dark:text-slate-200">{p.text}</p>
              <div className="mt-2.5 flex flex-wrap gap-4 text-[11px] text-slate-500 tabular-nums">
                <span>❤️ {p.likes}</span>
                <span>💬 {p.comments}</span>
                <span>🔁 {p.shares}</span>
                <span className="font-medium text-navy-700 dark:text-slate-300">Reach {p.reach.toLocaleString()}</span>
              </div>
            </li>
          ))}
        </ul>
        <p className="mt-3 flex items-center gap-1.5 text-xs text-slate-400"><Sparkles className="h-3.5 w-3.5 text-sage-500" /> Sample data — connect an account above to import your real posts and metrics.</p>
      </Card>
    </div>
  )
}

/* ============================================================
   WEBSITE — connect the site you have, or host with us.
   ============================================================ */
function WebsitePanel({ onBack }) {
  const { seat, toast } = useApp()
  const me = officerById(seat === 'team' ? 'julene' : seat)
  const link = applyLinkFor(me)
  return (
    <div>
      <button onClick={onBack} className="mb-3 inline-flex items-center gap-1.5 text-[13px] font-medium text-slate-500 transition-colors hover:text-navy-900 dark:hover:text-white">
        <ArrowLeft className="h-4 w-4" /> All imports
      </button>
      <PageHeader title="Website" sub="Keep the site you have, or let us host one for you — either way, leads land in here." />
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <Card title="Connect your current site" sub="Point your “Apply / Inquire” button at MS Lending and every lead is captured.">
          <p className="mb-2 text-xs font-medium text-slate-500">Your capture link</p>
          <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-2 dark:border-white/10 dark:bg-white/5">
            <Globe className="h-4 w-4 shrink-0 text-slate-400" />
            <span className="min-w-0 flex-1 truncate font-mono text-[12px] text-navy-900 dark:text-slate-200">{link}</span>
            <Btn variant="outline" sm onClick={() => { try { navigator.clipboard?.writeText('https://' + link) } catch { /* demo */ } toast('Link copied', '📋') }}>Copy</Btn>
          </div>
          <p className="mt-3 text-xs leading-relaxed text-slate-500">Swap your website’s button link for this one — visitors get captured here before they reach the long application.</p>
        </Card>
        <Card title="Host with MS Lending" sub="No website yet? We’ll stand up a clean one wired to your pipeline.">
          <ul className="space-y-2 text-[13px] text-slate-600 dark:text-slate-300">
            <li className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-sage-600" /> Your brand, your loan officers, your phone number</li>
            <li className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-sage-600" /> Inquiry form that feeds straight into Borrowers</li>
            <li className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-sage-600" /> The legal disclosures already built in</li>
          </ul>
          <Btn className="mt-4" onClick={() => toast('We’ll reach out to set up hosting (demo)', '🌐')}><ExternalLink className="h-3.5 w-3.5" /> Request hosting</Btn>
        </Card>
      </div>
    </div>
  )
}

/* ============================================================
   HUB — pick one thing at a time. Nothing else on screen.
   ============================================================ */
const SOURCES_GRID = [
  { id: 'clients', title: 'Clients & leads', blurb: 'Your whole pipeline from a CSV — Excel or your old system.', icon: Users, tone: 'bg-sky-50 text-sky-600', cta: 'Start here' },
  { id: 'photos', title: 'Photo library', blurb: 'Property, marketing, and headshot images in one place.', icon: ImageIcon, tone: 'bg-violet-50 text-violet-600' },
  { id: 'documents', title: 'Documents', blurb: 'PDFs and files, organized and easy to find.', icon: FileText, tone: 'bg-rose-50 text-rose-600' },
  { id: 'social', title: 'Social media', blurb: 'Posts and their metrics from Facebook, Instagram, LinkedIn.', icon: Share2, tone: 'bg-amber-50 text-amber-600' },
  { id: 'website', title: 'Website', blurb: 'Connect the site you have, or host a new one with us.', icon: Globe, tone: 'bg-sage-50 text-sage-700' },
]

function Hub({ onPick, photoCount, docCount }) {
  const { borrowers } = useApp()
  const count = { clients: `${borrowers.length} in workspace`, photos: photoCount ? `${photoCount} added` : null, documents: docCount ? `${docCount} added` : null }
  return (
    <div>
      <PageHeader title="Import & migrate" sub="Switching systems? Bring over only what you use. One thing at a time — we keep it tidy." />

      <div className="mb-5 flex items-start gap-3 rounded-2xl border border-navy-100 bg-gradient-to-br from-navy-50 to-white p-4 dark:border-white/10 dark:from-white/[0.04] dark:to-navy-900">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-navy-900 text-white"><Upload className="h-5 w-5" /></span>
        <div>
          <p className="text-sm font-semibold text-navy-950 dark:text-white">You don’t need everything your old system had.</p>
          <p className="mt-0.5 text-[13px] leading-relaxed text-slate-500 dark:text-slate-400">Pick a card below and move just that piece. Start with your clients — it takes about a minute.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {SOURCES_GRID.map((s) => {
          const Icon = s.icon
          return (
            <button
              key={s.id}
              onClick={() => onPick(s.id)}
              className="group flex flex-col rounded-2xl border border-slate-200/80 bg-white p-5 text-left shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition-all duration-200 hover:-translate-y-0.5 hover:border-navy-300/70 hover:shadow-[0_12px_30px_-14px_rgba(16,24,40,0.25)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-500/40 dark:border-white/10 dark:bg-navy-900 dark:hover:border-white/20"
            >
              <div className="flex items-center justify-between">
                <span className={cx('grid h-11 w-11 place-items-center rounded-xl', s.tone)}><Icon className="h-5 w-5" strokeWidth={2} /></span>
                {s.cta && <Badge cls="bg-sage-50 text-sage-700 ring-sage-600/20">{s.cta}</Badge>}
                {!s.cta && count[s.id] && <span className="text-[11px] text-slate-400">{count[s.id]}</span>}
              </div>
              <p className="mt-3 text-[15px] font-semibold text-navy-950 dark:text-white">{s.title}</p>
              <p className="mt-1 flex-1 text-[13px] leading-relaxed text-slate-500 dark:text-slate-400">{s.blurb}</p>
              <span className="mt-3 inline-flex items-center gap-1 text-[13px] font-medium text-navy-700 transition-colors group-hover:text-navy-900 dark:text-slate-300 dark:group-hover:text-white">
                Open <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </span>
            </button>
          )
        })}
      </div>

      <div className="mt-5 flex items-center gap-2 rounded-xl border border-slate-200/70 bg-slate-50/60 px-4 py-2.5 dark:border-white/10 dark:bg-white/[0.02]">
        <CheckCircle2 className="h-4 w-4 shrink-0 text-sage-500" />
        <p className="text-xs text-slate-500 dark:text-slate-400">Nothing imports until you confirm it. You can always come back and bring more over later.</p>
      </div>
    </div>
  )
}

export default function Import() {
  const [panel, setPanel] = useState('hub')
  // lifted so switching panels within Import keeps your session library
  const [photos, setPhotos] = useState([])
  const [docs, setDocs] = useState([])
  const back = () => setPanel('hub')

  if (panel === 'clients') return <ClientsPanel onBack={back} />
  if (panel === 'photos') return <PhotosPanel photos={photos} setPhotos={setPhotos} onBack={back} />
  if (panel === 'documents') return <DocumentsPanel docs={docs} setDocs={setDocs} onBack={back} />
  if (panel === 'social') return <SocialPanel onBack={back} />
  if (panel === 'website') return <WebsitePanel onBack={back} />
  return <Hub onPick={setPanel} photoCount={photos.length} docCount={docs.length} />
}
