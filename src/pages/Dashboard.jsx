import { useState, useEffect, useRef, useCallback } from 'react'
import { Sliders, Check, Plus, X, ChevronUp, ChevronDown, RotateCcw, GripVertical } from 'lucide-react'
import { useApp } from '../store.jsx'
import { SKY, timeOfDay } from '../data.js'
import { Btn, cx } from '../ui.jsx'
import { WIDGETS, WIDGET_BY_ID, DEFAULT_VISIBLE } from '../widgets.jsx'

const STARS = [
  ['14%', '24%'],
  ['22%', '58%'],
  ['30%', '34%'],
  ['18%', '78%'],
  ['40%', '66%'],
  ['52%', '20%'],
]

const LS_KEY = 'msl-dashboard-v1'
const ALL_IDS = WIDGETS.map((w) => w.id)

function loadLayout() {
  const fallback = { visible: DEFAULT_VISIBLE, hidden: ALL_IDS.filter((id) => !DEFAULT_VISIBLE.includes(id)) }
  try {
    const raw = JSON.parse(localStorage.getItem(LS_KEY))
    if (!raw || !Array.isArray(raw.visible)) return fallback
    // keep only known ids; append any new widgets to hidden so updates don't vanish
    const visible = raw.visible.filter((id) => ALL_IDS.includes(id))
    const hidden = ALL_IDS.filter((id) => !visible.includes(id))
    return { visible, hidden }
  } catch {
    return fallback
  }
}

export default function Dashboard() {
  const { metrics, go, seat, currentOfficer } = useApp()
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const sky = SKY[timeOfDay()]
  const firstName = currentOfficer ? currentOfficer.name.split(' ')[0] : null
  const todayLabel = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  const [layout, setLayout] = useState(loadLayout)
  const [customizing, setCustomizing] = useState(false)

  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(layout))
    } catch {
      /* storage unavailable (private mode) — layout still applies this session */
    }
  }, [layout])

  const move = (id, dir) =>
    setLayout((l) => {
      const v = [...l.visible]
      const i = v.indexOf(id)
      const j = i + dir
      if (i < 0 || j < 0 || j >= v.length) return l
      ;[v[i], v[j]] = [v[j], v[i]]
      return { ...l, visible: v }
    })
  const remove = (id) => setLayout((l) => ({ visible: l.visible.filter((x) => x !== id), hidden: [id, ...l.hidden] }))
  const add = (id) => setLayout((l) => ({ visible: [...l.visible, id], hidden: l.hidden.filter((x) => x !== id) }))
  const reset = () => setLayout({ visible: DEFAULT_VISIBLE, hidden: ALL_IDS.filter((id) => !DEFAULT_VISIBLE.includes(id)) })

  /* ---------------- drag-to-reorder (pointer based — mouse + touch) ---------------- */
  const gridRef = useRef(null)
  const dragMeta = useRef(null) // { id, grabX, grabY, w, h }
  const overIndexRef = useRef(0)
  const autoScroll = useRef(0)
  const [drag, setDrag] = useState(null) // { id, w, h, x, y } — drives the floating overlay
  const [overIndex, setOverIndex] = useState(0)

  const startDrag = useCallback(
    (e, id) => {
      // ignore secondary mouse buttons; allow touch & pen
      if (e.button != null && e.button !== 0) return
      const cell = e.currentTarget.closest('[data-wid]')
      if (!cell) return
      e.preventDefault()
      const r = cell.getBoundingClientRect()
      dragMeta.current = { id, grabX: e.clientX - r.left, grabY: e.clientY - r.top, w: r.width, h: r.height }
      const startIdx = layout.visible.indexOf(id)
      overIndexRef.current = startIdx
      setOverIndex(startIdx)
      setDrag({ id, w: r.width, h: r.height, x: e.clientX, y: e.clientY })
    },
    [layout.visible],
  )

  useEffect(() => {
    if (!drag) return
    let raf
    const tick = () => {
      if (autoScroll.current) window.scrollBy(0, autoScroll.current)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)

    const onMove = (e) => {
      e.preventDefault()
      const x = e.clientX
      const y = e.clientY
      setDrag((dr) => (dr ? { ...dr, x, y } : dr))

      // where would the card land? count how many other cards sit "before" the pointer
      const meta = dragMeta.current
      const slots = gridRef.current?.querySelectorAll('[data-wid]') ?? []
      let index = 0
      for (const el of slots) {
        if (el.dataset.wid === meta.id) continue
        const r = el.getBoundingClientRect()
        const before = y > r.bottom || (y >= r.top && x > r.left + r.width / 2)
        if (before) index++
      }
      if (index !== overIndexRef.current) {
        overIndexRef.current = index
        setOverIndex(index)
      }

      // auto-scroll when near the top/bottom edge (key for mobile)
      const edge = 92
      autoScroll.current = y < edge ? -14 : y > window.innerHeight - edge ? 14 : 0
    }

    const onUp = () => {
      const meta = dragMeta.current
      const target = overIndexRef.current
      setLayout((l) => {
        const others = l.visible.filter((id) => id !== meta.id)
        return { ...l, visible: [...others.slice(0, target), meta.id, ...others.slice(target)] }
      })
      setDrag(null)
      autoScroll.current = 0
    }

    window.addEventListener('pointermove', onMove, { passive: false })
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    document.documentElement.classList.add('select-none', 'cursor-grabbing')
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
      document.documentElement.classList.remove('select-none', 'cursor-grabbing')
    }
  }, [drag?.id])

  // display order: while dragging, pull the card out and re-insert it at the hovered slot
  const others = drag ? layout.visible.filter((id) => id !== drag.id) : layout.visible
  const displayOrder = drag ? [...others.slice(0, overIndex), drag.id, ...others.slice(overIndex)] : layout.visible
  const dragW = drag ? WIDGET_BY_ID[drag.id] : null

  return (
    <div className="space-y-5">
      {/* ---------- greeting hero (time-of-day sky) ---------- */}
      <div className={cx('glow-ring relative overflow-hidden rounded-2xl bg-gradient-to-br p-5 ring-1 ring-black/[0.04] sm:p-6', sky.grad)}>
        <div className="pointer-events-none absolute inset-0">
          {sky.moon &&
            STARS.map(([top, left], i) => (
              <span key={i} className="animate-twinkle absolute h-1 w-1 rounded-full bg-white" style={{ top, left, animationDelay: `${i * 0.45}s` }} />
            ))}
          <div className="animate-sunrise absolute -right-4 -top-10">
            <div className="relative">
              <div className={cx('absolute -inset-10 rounded-full blur-2xl', sky.glow)} />
              <div className="animate-floaty h-28 w-28 rounded-full sm:h-32 sm:w-32" style={{ background: sky.orbBg, boxShadow: sky.shadow }} />
            </div>
          </div>
        </div>
        <div className="relative z-10 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className={cx('text-xs', sky.muted)}>{todayLabel}</p>
            <h1 className={cx('mt-0.5 text-2xl font-semibold tracking-tight', sky.text)}>
              {greeting}
              {firstName ? `, ${firstName}` : ''}
            </h1>
            <p className={cx('mt-1 text-[13px]', sky.muted)}>
              {firstName ? 'Here’s your day — your calendar, tasks, and open loans.' : 'Your calendar, tasks, and open loans at a glance.'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Btn variant="outline" onClick={() => go('calendar')}>
              Calendar
            </Btn>
            <Btn onClick={() => go('tasks')}>
              Today’s tasks
              <span className="rounded bg-white/15 px-1.5 text-xs tabular-nums">{metrics.todays.length}</span>
            </Btn>
          </div>
        </div>
      </div>

      {/* ---------- customize toolbar ---------- */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[13px] font-medium text-slate-500 dark:text-slate-400">
          {customizing ? 'Drag a card by its handle to reorder — works on touch too' : 'Your workspace'}
        </p>
        <div className="flex items-center gap-2">
          {customizing && (
            <button
              onClick={reset}
              className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-navy-900 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Reset
            </button>
          )}
          <Btn variant={customizing ? 'sage' : 'outline'} onClick={() => setCustomizing((v) => !v)}>
            {customizing ? (
              <>
                <Check className="h-3.5 w-3.5" /> Done
              </>
            ) : (
              <>
                <Sliders className="h-3.5 w-3.5" /> Customize
              </>
            )}
          </Btn>
        </div>
      </div>

      {/* ---------- widget grid ---------- */}
      <div ref={gridRef} className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {displayOrder.map((id, i) => {
          const w = WIDGET_BY_ID[id]
          if (!w) return null
          const Widget = w.Component
          const spanCls = w.size === 'full' ? 'lg:col-span-2' : ''
          const isDragging = drag?.id === id

          // the slot the dragged card will drop into — a snap target
          if (isDragging) {
            return (
              <div key={id} data-wid={id} className={cx('relative', spanCls)}>
                <div
                  className="grid place-items-center rounded-xl border-2 border-dashed border-navy-400/60 bg-navy-50/50 dark:border-white/25 dark:bg-white/[0.04]"
                  style={{ height: drag.h }}
                >
                  <span className="text-xs font-medium text-navy-500 dark:text-slate-300">Drop here</span>
                </div>
              </div>
            )
          }

          if (!customizing) {
            return (
              <div key={id} data-wid={id} className={cx('relative', spanCls)}>
                <Widget />
              </div>
            )
          }

          // customize mode: a grab handle bar on top, the widget locked below
          return (
            <div key={id} data-wid={id} className={cx('relative', spanCls)}>
              <div className="overflow-hidden rounded-xl outline-2 outline-dashed outline-offset-2 outline-navy-300/70 dark:outline-white/20">
                <div
                  onPointerDown={(e) => startDrag(e, id)}
                  style={{ touchAction: 'none' }}
                  className="flex cursor-grab touch-none items-center gap-2 border-b border-navy-100 bg-navy-50/80 px-3 py-2 active:cursor-grabbing dark:border-white/10 dark:bg-white/[0.06]"
                >
                  <GripVertical className="h-4 w-4 shrink-0 text-navy-400 dark:text-slate-300" />
                  <span className="flex min-w-0 items-center gap-1.5 text-xs font-semibold text-navy-800 dark:text-slate-200">
                    <w.icon className="h-3.5 w-3.5 shrink-0 text-navy-500 dark:text-slate-300" strokeWidth={1.75} />
                    <span className="truncate">{w.name}</span>
                  </span>
                  <div className="ml-auto flex items-center gap-0.5" onPointerDown={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => move(id, -1)}
                      disabled={i === 0}
                      title="Move up"
                      aria-label={`Move ${w.name} up`}
                      className="rounded p-1 text-slate-500 transition-colors hover:bg-white hover:text-navy-900 disabled:opacity-30 dark:text-slate-300 dark:hover:bg-white/10"
                    >
                      <ChevronUp className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => move(id, 1)}
                      disabled={i === displayOrder.length - 1}
                      title="Move down"
                      aria-label={`Move ${w.name} down`}
                      className="rounded p-1 text-slate-500 transition-colors hover:bg-white hover:text-navy-900 disabled:opacity-30 dark:text-slate-300 dark:hover:bg-white/10"
                    >
                      <ChevronDown className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => remove(id)}
                      title="Remove widget"
                      aria-label={`Remove ${w.name}`}
                      className="rounded p-1 text-rose-500 transition-colors hover:bg-rose-50 dark:hover:bg-rose-500/15"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div className="pointer-events-none select-none">
                  <Widget />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* ---------- floating drag overlay (follows the finger / cursor) ---------- */}
      {drag && dragW && (
        <div
          className="animate-liftin pointer-events-none fixed z-[90] origin-top-left"
          style={{
            left: drag.x - dragMeta.current.grabX,
            top: drag.y - dragMeta.current.grabY,
            width: drag.w,
          }}
        >
          <div className="rotate-[1.5deg] rounded-xl shadow-[0_24px_48px_-12px_rgba(16,24,40,0.4)] ring-2 ring-navy-400/70">
            <dragW.Component />
          </div>
        </div>
      )}

      {/* ---------- add-widget tray (customize mode) ---------- */}
      {customizing && (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/60 p-4 dark:border-white/15 dark:bg-white/[0.03]">
          <p className="mb-2.5 flex items-center gap-1.5 text-[13px] font-semibold text-navy-950 dark:text-white">
            <Plus className="h-4 w-4" /> Add a widget
          </p>
          {layout.hidden.length === 0 ? (
            <p className="text-xs text-slate-400">Every widget is on your dashboard. Remove one to see it here.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {layout.hidden.map((id) => {
                const w = WIDGET_BY_ID[id]
                if (!w) return null
                const Icon = w.icon
                return (
                  <button
                    key={id}
                    onClick={() => add(id)}
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px] font-medium text-slate-700 shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:border-navy-300/70 hover:text-navy-900 active:scale-[0.97] dark:border-white/10 dark:bg-navy-900 dark:text-slate-200 dark:hover:border-white/25"
                  >
                    <Icon className="h-4 w-4 text-navy-500 dark:text-slate-300" strokeWidth={1.75} />
                    {w.name}
                    <Plus className="h-3.5 w-3.5 text-slate-400" />
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}

      {layout.visible.length === 0 && !customizing && (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center dark:border-white/15 dark:bg-navy-900">
          <p className="text-sm font-medium text-slate-600 dark:text-slate-300">Your dashboard is empty</p>
          <p className="mt-1 text-xs text-slate-400">Tap Customize to add the widgets you want.</p>
          <Btn variant="sage" className="mx-auto mt-4" onClick={() => setCustomizing(true)}>
            <Sliders className="h-3.5 w-3.5" /> Customize
          </Btn>
        </div>
      )}
    </div>
  )
}
