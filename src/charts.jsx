import { cx } from './ui.jsx'

/* ---------- horizontal pipeline bars ---------- */
export function PipelineBars({ data, onPick }) {
  const max = Math.max(...data.map((r) => r.count), 1)
  return (
    <div className="space-y-1">
      {data.map((r) => (
        <button
          key={r.label}
          onClick={() => onPick?.(r.label)}
          className="group grid w-full grid-cols-[8rem_1fr_1.5rem] items-center gap-2.5 rounded-md px-1 py-1 text-left transition-colors hover:bg-slate-50"
          title={`View ${r.label} files`}
        >
          <span className="truncate text-xs text-slate-500 transition-colors group-hover:text-navy-900">
            {r.label}
          </span>
          <span className="h-3.5 overflow-hidden rounded-[3px] bg-slate-100">
            <span
              className="block h-full rounded-[3px] opacity-80 transition-opacity group-hover:opacity-100"
              style={{ width: `${(r.count / max) * 100}%`, backgroundColor: r.color, minWidth: r.count ? 8 : 0 }}
            />
          </span>
          <span className="text-right text-xs font-medium text-slate-600 tabular-nums">{r.count}</span>
        </button>
      ))}
    </div>
  )
}

/* ---------- donut ---------- */
const DONUT_COLORS = ['#425d8c', '#69a87b', '#14b8a6', '#3b82f6', '#7894bf', '#94a3b8']

export function Donut({ segments, centerLabel = 'leads' }) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1
  const R = 42
  const C = 2 * Math.PI * R
  let acc = 0
  return (
    <div className="flex items-center gap-5">
      <svg viewBox="0 0 110 110" className="h-28 w-28 shrink-0 -rotate-90">
        <circle cx="55" cy="55" r={R} fill="none" stroke="#f1f5f9" strokeWidth="12" />
        {segments.map((s, i) => {
          const frac = s.value / total
          const el = (
            <circle
              key={s.label}
              cx="55"
              cy="55"
              r={R}
              fill="none"
              stroke={DONUT_COLORS[i % DONUT_COLORS.length]}
              strokeWidth="12"
              strokeLinecap="butt"
              strokeDasharray={`${frac * C - 1.5} ${C}`}
              strokeDashoffset={-acc * C}
            />
          )
          acc += frac
          return el
        })}
        <g className="rotate-90" style={{ transformOrigin: '55px 55px' }}>
          <text x="55" y="53" textAnchor="middle" className="fill-navy-950 text-[17px] font-semibold">
            {total}
          </text>
          <text x="55" y="67" textAnchor="middle" className="fill-slate-400 text-[9px] font-medium">
            {centerLabel}
          </text>
        </g>
      </svg>
      <ul className="min-w-0 flex-1 space-y-1.5">
        {segments.map((s, i) => (
          <li key={s.label} className="flex items-center gap-2 text-xs">
            <span
              className="h-2 w-2 shrink-0 rounded-[3px]"
              style={{ backgroundColor: DONUT_COLORS[i % DONUT_COLORS.length] }}
            />
            <span className="min-w-0 flex-1 truncate text-slate-500">{s.label}</span>
            <span className="font-medium text-slate-700 tabular-nums">{s.value}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/* ---------- sparkline ---------- */
export function Sparkline({ values, className = 'h-16 w-full' }) {
  const W = 240
  const H = 60
  const pad = 6
  const max = Math.max(...values)
  const min = Math.min(...values)
  const span = max - min || 1
  const pts = values.map((v, i) => [
    pad + (i / (values.length - 1)) * (W - pad * 2),
    H - pad - ((v - min) / span) * (H - pad * 2),
  ])
  const line = pts.map((p) => p.join(',')).join(' ')
  const area = `${pad},${H - 2} ${line} ${W - pad},${H - 2}`
  const last = pts[pts.length - 1]
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={cx(className)} preserveAspectRatio="none">
      <polygon points={area} fill="#478b5b" fillOpacity="0.07" />
      <polyline
        points={line}
        fill="none"
        stroke="#478b5b"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={last[0]} cy={last[1]} r="3" fill="#478b5b" stroke="#fff" strokeWidth="1.5" />
    </svg>
  )
}
