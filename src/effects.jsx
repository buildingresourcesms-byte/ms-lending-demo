import { useEffect, useRef, useState } from 'react'

/* Lightweight, dependency-free visual effects (reactbits.dev-inspired).
   All honor prefers-reduced-motion and animate only opacity/transform. */

const cx = (...a) => a.filter(Boolean).join(' ')
const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3)
const prefersReduced = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/* Pull the first number out of a value and remember how to re-render it,
   so "$1.2M", "92%", "1,240", "30 days" all count up while keeping their
   prefix/suffix and formatting. Returns null if there's no number. */
function parseLeadingNumber(value) {
  try {
    if (typeof value !== 'string' && typeof value !== 'number') return null
    const str = String(value)
    const m = str.match(/-?\d[\d,]*\.?\d*/)
    if (!m) return null
    const raw = m[0]
    const num = parseFloat(raw.replace(/,/g, ''))
    if (!isFinite(num)) return null
    const decimals = raw.includes('.') ? (raw.split('.')[1] || '').length : 0
    const grouped = raw.includes(',')
    const before = str.slice(0, m.index)
    const after = str.slice(m.index + raw.length)
    const render = (n) =>
      before +
      (grouped
        ? n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
        : n.toFixed(decimals)) +
      after
    return { num, render, key: str }
  } catch {
    return null
  }
}

/* Counts the number inside `value` up from zero on first view. Renders the
   value unchanged if there's no number or motion is reduced. */
export function CountUpText({ value, duration = 1400, className }) {
  const ref = useRef(null)
  const [p, setP] = useState(0)
  const parsed = parseLeadingNumber(value)

  useEffect(() => {
    if (!parsed) return
    if (prefersReduced()) {
      setP(1)
      return
    }
    const node = ref.current
    let raf = 0
    let started = false
    const start = () => {
      if (started) return
      started = true
      const t0 = performance.now()
      const tick = (now) => {
        const prog = Math.min((now - t0) / duration, 1)
        setP(prog)
        if (prog < 1) raf = requestAnimationFrame(tick)
      }
      raf = requestAnimationFrame(tick)
    }
    if (!node || typeof IntersectionObserver === 'undefined') {
      start()
      return () => cancelAnimationFrame(raf)
    }
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          start()
          io.disconnect()
        }
      },
      { threshold: 0.4 },
    )
    io.observe(node)
    return () => {
      io.disconnect()
      cancelAnimationFrame(raf)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parsed?.key, duration])

  if (!parsed) return <span className={className}>{value}</span>
  return (
    <span ref={ref} className={className} aria-label={String(value)}>
      {parsed.render(parsed.num * easeOutCubic(p))}
    </span>
  )
}

/* Fades + rises its children in when scrolled into view (once). */
export function Reveal({ children, delay = 0, className }) {
  const ref = useRef(null)
  const [shown, setShown] = useState(false)
  useEffect(() => {
    const node = ref.current
    if (!node) return
    if (prefersReduced()) {
      setShown(true)
      return
    }
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setShown(true)
          io.disconnect()
        }
      },
      { threshold: 0.12 },
    )
    io.observe(node)
    return () => io.disconnect()
  }, [])
  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={cx(
        'transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]',
        shown ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0',
        className,
      )}
    >
      {children}
    </div>
  )
}

/* Spreads cursor position onto CSS vars (--mx/--my) for a .spotlight-card
   radial glow. Returns props to spread onto any element with that class. */
export function useSpotlight() {
  return {
    onMouseMove: (e) => {
      const el = e.currentTarget
      const r = el.getBoundingClientRect()
      el.style.setProperty('--mx', e.clientX - r.left + 'px')
      el.style.setProperty('--my', e.clientY - r.top + 'px')
    },
  }
}
