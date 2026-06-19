import { useRef, useState } from 'react'
import { Search, ChevronDown, X, ArrowRight, UploadCloud } from 'lucide-react'
import { STATUS_STYLES, DOC_STYLES, PRIORITY_STYLES } from './data.js'
import { CountUpText, useSpotlight } from './effects.jsx'

export const cx = (...a) => a.filter(Boolean).join(' ')

/* ---------- brand mark: MS monogram ---------- */
export function BrandMark({ className = 'w-10 h-10' }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <rect width="48" height="48" rx="11" fill="var(--color-navy-900, #24314a)" />
      <text
        x="24"
        y="29.5"
        textAnchor="middle"
        fontFamily="Inter, ui-sans-serif, sans-serif"
        fontSize="17"
        fontWeight="700"
        fill="#ffffff"
        letterSpacing="0.5"
      >
        MS
      </text>
      <rect x="13" y="35" width="22" height="2.5" rx="1.25" fill="var(--color-sage-400, #69a87b)" />
    </svg>
  )
}

/* ---------- badges ---------- */
export function Badge({ children, cls = 'bg-slate-50 text-slate-600 ring-slate-400/30', dot }) {
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-medium whitespace-nowrap ring-1 ring-inset',
        cls,
      )}
    >
      {dot && <span className={cx('h-1.5 w-1.5 rounded-full', dot)} />}
      {children}
    </span>
  )
}

export const StatusBadge = ({ status }) => {
  const s = STATUS_STYLES[status] ?? {}
  return <Badge cls={s.badge} dot={s.dot}>{status}</Badge>
}

export const DocBadge = ({ status }) => {
  const s = DOC_STYLES[status] ?? {}
  return <Badge cls={s.badge} dot={s.dot}>{status}</Badge>
}

export const PriorityBadge = ({ priority }) => (
  <Badge cls={PRIORITY_STYLES[priority]}>{priority}</Badge>
)

/* ---------- cards ---------- */
export function Card({ title, sub, action, children, className, pad = true }) {
  return (
    <section
      className={cx(
        'rounded-xl border border-slate-200/80 bg-white shadow-[0_1px_3px_rgba(16,24,40,0.06)] dark:border-white/10 dark:bg-navy-900',
        className,
      )}
    >
      {(title || action) && (
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-3 dark:border-white/10">
          <div className="min-w-0">
            <h3 className="text-[13px] font-semibold text-navy-950 dark:text-white">{title}</h3>
            {sub && <p className="mt-0.5 truncate text-xs text-slate-400 dark:text-slate-400">{sub}</p>}
          </div>
          {action}
        </div>
      )}
      <div className={cx(pad && 'px-5 py-4')}>{children}</div>
    </section>
  )
}

/* Accent presets pair an icon color with a soft tinted chip.
   Literal class strings so Tailwind's JIT keeps them. */
const STAT_ACCENTS = {
  sky:    { icon: 'text-sky-600',    chip: 'bg-sky-50' },
  navy:   { icon: 'text-navy-600',   chip: 'bg-navy-50' },
  amber:  { icon: 'text-amber-600',  chip: 'bg-amber-50' },
  violet: { icon: 'text-violet-600', chip: 'bg-violet-50' },
  sage:   { icon: 'text-sage-700',   chip: 'bg-sage-50' },
  rose:   { icon: 'text-rose-600',   chip: 'bg-rose-50' },
  slate:  { icon: 'text-slate-500',  chip: 'bg-slate-100' },
}

export function Stat({ icon: Icon, label, value, accent = 'slate', onClick }) {
  const a = STAT_ACCENTS[accent] ?? STAT_ACCENTS.slate
  const Tag = onClick ? 'button' : 'div'
  const spot = useSpotlight()
  return (
    <Tag
      onClick={onClick}
      {...spot}
      className={cx(
        'spotlight-card group relative w-full overflow-hidden rounded-xl border border-slate-200/80 bg-white p-4 text-left shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition-all duration-200 dark:border-white/10 dark:bg-navy-900',
        onClick &&
          'cursor-pointer hover:-translate-y-0.5 hover:border-navy-300/70 hover:shadow-[0_10px_28px_-14px_rgba(16,24,40,0.22)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-500/40 dark:hover:border-white/20',
      )}
    >
      <span className="flex items-start justify-between gap-2">
        <span className="truncate pt-1 text-xs font-medium text-slate-500 dark:text-slate-400">{label}</span>
        {Icon && (
          <span className={cx('grid h-8 w-8 shrink-0 place-items-center rounded-lg', a.chip)}>
            <Icon className={cx('h-[18px] w-[18px]', a.icon)} strokeWidth={2} />
          </span>
        )}
      </span>
      <span className="mt-1.5 block text-[26px] font-semibold leading-8 tracking-tight text-navy-950 tabular-nums dark:text-white">
        <CountUpText value={value} />
      </span>
      {onClick && (
        <ArrowRight className="absolute bottom-3.5 right-3.5 h-4 w-4 -translate-x-1 text-navy-400 opacity-0 transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100" />
      )}
    </Tag>
  )
}

/* ---------- people ---------- */
export function Avatar({ officer, size = 'h-7 w-7 text-[10px]' }) {
  if (!officer) return null
  return (
    <span
      title={officer.name}
      className={cx(
        'grid shrink-0 place-items-center rounded-full font-semibold text-white ring-1 ring-black/[0.08]',
        officer.color,
        size,
      )}
    >
      {officer.initials}
    </span>
  )
}

/* ---------- progress ---------- */
export function ProgressBar({ pct, className = 'h-1.5', tone = 'bg-sage-500' }) {
  return (
    <div className={cx('w-full overflow-hidden rounded-full bg-slate-100', className)}>
      <div
        className={cx('h-full rounded-full transition-[width] duration-300', tone)}
        style={{ width: `${Math.max(pct, 2)}%` }}
      />
    </div>
  )
}

/* ---------- inputs ---------- */
export function SearchInput({ value, onChange, placeholder = 'Search…', className, onKeyDown, hint }) {
  return (
    <div className={cx('relative', className)}>
      <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        className="h-9 w-full rounded-lg border border-slate-300/70 bg-white pl-8 pr-3 text-[13px] text-slate-700 transition-colors placeholder:text-slate-400 focus:border-navy-500 focus:outline-none focus:ring-2 focus:ring-navy-500/15 dark:border-white/15 dark:bg-white/5 dark:text-slate-100"
      />
      {hint && (
        <kbd className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 rounded border border-slate-200 bg-slate-50 px-1 text-[10px] font-medium text-slate-400">
          {hint}
        </kbd>
      )}
    </div>
  )
}

export function Select({ value, onChange, options, label, className }) {
  return (
    <div className={cx('relative', className)}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 w-full cursor-pointer appearance-none rounded-lg border border-slate-300/70 bg-white pl-2.5 pr-7 text-[13px] text-slate-700 transition-colors hover:border-slate-400/80 focus:border-navy-500 focus:outline-none focus:ring-2 focus:ring-navy-500/15 dark:border-white/15 dark:bg-navy-900 dark:text-slate-100"
      >
        {label && <option value="All">{label}</option>}
        {options.map((o) =>
          typeof o === 'string' ? (
            <option key={o} value={o}>{o}</option>
          ) : (
            <option key={o.value} value={o.value}>{o.label}</option>
          ),
        )}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
    </div>
  )
}

export function Toggle({ on, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!on)}
      className={cx(
        'relative h-6 w-11 shrink-0 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-500/40 focus-visible:ring-offset-1',
        on ? 'bg-sage-600' : 'bg-slate-300',
      )}
      aria-pressed={on}
    >
      <span
        className={cx(
          'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-all duration-200',
          on ? 'left-[22px]' : 'left-0.5',
        )}
      />
    </button>
  )
}

export function FilterChip({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={cx(
        'h-8 rounded-lg border px-3 text-xs font-medium transition-all duration-150 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-500/40',
        active
          ? 'border-navy-900 bg-navy-900 text-white shadow-[0_1px_2px_rgba(16,24,40,0.18)]'
          : 'border-slate-300/70 bg-white text-slate-600 hover:border-slate-400/70 hover:bg-slate-50 hover:text-navy-900',
      )}
    >
      {children}
    </button>
  )
}

/* ---------- buttons ---------- */
export function Btn({ children, onClick, variant = 'primary', className, type = 'button', disabled, sm }) {
  const styles = {
    primary:
      'border border-navy-950/90 bg-navy-900 text-white shadow-[0_1px_2px_rgba(16,24,40,0.18),inset_0_1px_0_rgba(255,255,255,0.08)] hover:bg-navy-800 focus-visible:ring-navy-500/50',
    soft: 'border border-navy-100 bg-navy-50 text-navy-800 hover:bg-navy-100 focus-visible:ring-navy-500/40 dark:border-white/10 dark:bg-white/10 dark:text-navy-100 dark:hover:bg-white/15',
    sage: 'border border-sage-700/90 bg-sage-600 text-white shadow-[0_1px_2px_rgba(16,24,40,0.18),inset_0_1px_0_rgba(255,255,255,0.1)] hover:bg-sage-700 focus-visible:ring-sage-500/50',
    ghost: 'border border-transparent text-slate-600 hover:bg-slate-100 focus-visible:ring-navy-500/40 dark:text-slate-300 dark:hover:bg-white/10',
    outline:
      'border border-slate-300/80 bg-white text-slate-700 shadow-[0_1px_1px_rgba(16,24,40,0.04)] hover:border-slate-400/80 hover:bg-slate-50 hover:text-navy-900 focus-visible:ring-navy-500/40 dark:border-white/15 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10 dark:hover:text-white',
  }
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={cx(
        'inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition-all duration-150 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-50',
        sm ? 'h-7 px-2.5 text-xs' : 'h-9 px-3.5 text-[13px]',
        styles[variant],
        className,
      )}
    >
      {children}
    </button>
  )
}

/* ---------- modal ---------- */
export function Modal({ open, onClose, title, sub, children, wide }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="animate-fadein fixed inset-0 bg-navy-950/50" onClick={onClose} />
      <div className="relative flex min-h-full items-start justify-center p-4 sm:p-6">
        <div
          className={cx(
            'animate-modalin relative mt-[6vh] w-full rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_24px_60px_-12px_rgba(16,24,40,0.35)] dark:border-white/10 dark:bg-navy-900',
            wide ? 'max-w-2xl' : 'max-w-lg',
          )}
        >
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-[15px] font-semibold tracking-tight text-navy-950 dark:text-white">{title}</h2>
              {sub && <p className="mt-0.5 text-xs text-slate-400">{sub}</p>}
            </div>
            <button
              onClick={onClose}
              className="rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          {children}
        </div>
      </div>
    </div>
  )
}

/* ---------- form field ---------- */
export function Field({ label, children, className }) {
  return (
    <label className={cx('block', className)}>
      <span className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">{label}</span>
      {children}
    </label>
  )
}

/* ---------- drag & drop upload (demo: reacts to the drop, ignores bytes) ---------- */
export function DropZone({ onFiles, label = 'Drag & drop files here', hint = 'or click to browse', className }) {
  const [over, setOver] = useState(false)
  const inputRef = useRef(null)
  const handle = (files) => {
    if (files && files.length) onFiles(files)
  }
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => inputRef.current?.click()}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && inputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault()
        setOver(true)
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault()
        setOver(false)
        handle(e.dataTransfer.files)
      }}
      className={cx(
        'cursor-pointer rounded-xl border-2 border-dashed px-4 py-6 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-500/40',
        over
          ? 'border-navy-400 bg-navy-50/60 dark:border-navy-300 dark:bg-white/10'
          : 'border-slate-300 bg-slate-50/40 hover:border-slate-400 dark:border-white/15 dark:bg-white/5 dark:hover:border-white/25',
        className,
      )}
    >
      <input ref={inputRef} type="file" multiple className="hidden" onChange={(e) => handle(e.target.files)} />
      <UploadCloud className={cx('mx-auto mb-1.5 h-6 w-6', over ? 'text-navy-500' : 'text-slate-400')} strokeWidth={1.75} />
      <p className="text-[13px] font-medium text-slate-600 dark:text-slate-200">{label}</p>
      <p className="text-xs text-slate-400">{hint}</p>
    </div>
  )
}

export const inputCls =
  'h-9 w-full rounded-lg border border-slate-300/70 bg-white px-2.5 text-[13px] text-slate-700 transition-colors placeholder:text-slate-400 hover:border-slate-400/80 focus:border-navy-500 focus:outline-none focus:ring-2 focus:ring-navy-500/15 dark:border-white/15 dark:bg-white/5 dark:text-slate-100'

/* ---------- misc ---------- */
export function PageHeader({ title, sub, actions }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-navy-950 dark:text-white">{title}</h1>
        {sub && <p className="mt-1 text-[13px] text-slate-500 dark:text-slate-400">{sub}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

export function EmptyState({ icon: Icon, title, sub }) {
  return (
    <div className="grid place-items-center px-6 py-10 text-center">
      {Icon && <Icon className="mb-2 h-5 w-5 text-slate-300" strokeWidth={1.5} />}
      <p className="text-[13px] font-medium text-slate-500">{title}</p>
      {sub && <p className="mt-0.5 text-xs text-slate-400">{sub}</p>}
    </div>
  )
}

export function KV({ k, v, className }) {
  return (
    <div className={className}>
      <dt className="text-xs text-slate-400">{k}</dt>
      <dd className="mt-0.5 text-[13px] font-medium text-slate-800 tabular-nums">{v ?? '—'}</dd>
    </div>
  )
}
