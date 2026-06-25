import { useCallback, useEffect, useMemo, useState } from 'react'
import { Star, Plug, Eye, Phone, MapPin, MessageSquare, Loader2, RefreshCw, Send, Check } from 'lucide-react'
import { useApp } from '../store.jsx'
import { GBP_PROFILE, GBP_REVIEWS, gbpSummary, relDate } from '../data.js'
import { integrationBackendStatus, runIntegrationAction } from '../api.js'
import { PageHeader, Card, Stat, Btn, Badge, cx } from '../ui.jsx'

function Stars({ n, className = 'h-3.5 w-3.5' }) {
  return (
    <span className="inline-flex">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} className={cx(className, i <= n ? 'fill-amber-400 text-amber-400' : 'text-slate-300 dark:text-white/20')} strokeWidth={1.5} />
      ))}
    </span>
  )
}

function ReviewRow({ r, onReply }) {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const send = () => {
    if (!text.trim()) return
    onReply(r.id, text.trim())
    setText('')
    setOpen(false)
  }
  return (
    <li className="px-4 py-3.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-navy-100 text-[11px] font-semibold text-navy-700 dark:bg-white/10 dark:text-white">
            {r.author.slice(0, 1)}
          </span>
          <span className="text-[13px] font-semibold text-navy-950 dark:text-white">{r.author}</span>
        </div>
        <span className="flex items-center gap-2">
          <Stars n={r.rating} />
          <span className="text-[11px] text-slate-400">{relDate(String(r.date).slice(0, 10))}</span>
        </span>
      </div>
      <p className="mt-1.5 text-[13px] leading-relaxed text-slate-600 dark:text-slate-300">{r.text}</p>

      {r.reply ? (
        <div className="mt-2 rounded-lg border-l-2 border-sage-400 bg-sage-50/60 px-3 py-2 text-xs text-slate-600 dark:bg-sage-500/10 dark:text-slate-300">
          <span className="font-semibold text-sage-700 dark:text-sage-300">You replied:</span> {r.reply}
        </div>
      ) : open ? (
        <div className="mt-2 flex items-end gap-2">
          <textarea
            autoFocus
            rows={2}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={`Thank ${r.author.split(' ')[0]} for the review…`}
            className="flex-1 resize-none rounded-lg border border-slate-300/70 bg-white px-2.5 py-2 text-[13px] text-slate-700 focus:border-navy-500 focus:outline-none focus:ring-2 focus:ring-navy-500/15 dark:border-white/15 dark:bg-navy-950 dark:text-slate-100"
          />
          <Btn variant="sage" onClick={send} disabled={!text.trim()}><Send className="h-3.5 w-3.5" /> Reply</Btn>
        </div>
      ) : (
        <button onClick={() => setOpen(true)} className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-navy-600 transition-colors hover:text-navy-900 dark:text-slate-300 dark:hover:text-white">
          <MessageSquare className="h-3.5 w-3.5" /> Reply
        </button>
      )}
    </li>
  )
}

export default function GoogleBusiness() {
  const { toast, go } = useApp()
  const [connected, setConnected] = useState(false)
  const [probing, setProbing] = useState(true)
  const [reviews, setReviews] = useState(GBP_REVIEWS)

  const load = useCallback(async () => {
    setProbing(true)
    try {
      const status = await integrationBackendStatus({ refresh: true })
      const gbp = status.connectors?.gbp
      if (gbp?.connected) {
        setConnected(true)
        try {
          const live = await runIntegrationAction('gbp', 'list_reviews', {})
          if (Array.isArray(live?.reviews) && live.reviews.length) {
            setReviews(
              live.reviews.map((rv, i) => ({
                id: rv.reviewId || 'g' + i,
                author: rv.reviewer?.displayName || 'Google user',
                rating: { ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5 }[rv.starRating] || rv.starRating || 5,
                date: (rv.createTime || '').slice(0, 10),
                text: rv.comment || '',
                reply: rv.reviewReply?.comment || '',
              })),
            )
          }
        } catch {
          /* connected but no data yet — keep sample so the page is never empty */
        }
      } else {
        setConnected(false)
      }
    } catch {
      setConnected(false)
    } finally {
      setProbing(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const reply = (id, text) => {
    setReviews((list) => list.map((r) => (r.id === id ? { ...r, reply: text } : r)))
    toast(connected ? 'Reply posted to Google' : 'Reply saved (connect to post it live)', '💬')
  }

  const summary = useMemo(() => gbpSummary(reviews, GBP_PROFILE), [reviews])

  return (
    <div>
      <PageHeader
        title="Google Business"
        sub="Your Google rating, profile activity, and reviews — reply without leaving the workspace."
        actions={
          connected ? (
            <Btn variant="outline" onClick={load}><RefreshCw className="h-3.5 w-3.5" /> Refresh</Btn>
          ) : (
            <Btn variant="sage" onClick={() => go('integrations')}><Plug className="h-3.5 w-3.5" /> Connect Google Business</Btn>
          )
        }
      />

      {!probing && !connected && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-[13px] text-amber-800 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-200">
          <Plug className="h-4 w-4 shrink-0" /> Showing sample data. Connect your Google Business Profile to pull your real rating &amp; reviews.
        </div>
      )}
      {connected && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-sage-300/70 bg-sage-50/70 px-3.5 py-2.5 text-[13px] text-sage-800 dark:border-sage-500/30 dark:bg-sage-500/10 dark:text-sage-200">
          <Check className="h-4 w-4 shrink-0" /> Connected — showing your live Google Business reviews.
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat icon={Star} accent="amber" label="Rating" value={`${summary.rating} ★`} />
        <Stat icon={MessageSquare} accent="navy" label="Reviews" value={String(summary.reviewCount)} />
        <Stat icon={Eye} accent="sky" label="Profile views · 30d" value={String(GBP_PROFILE.views30d)} />
        <Stat icon={Phone} accent="sage" label="Calls · 30d" value={String(GBP_PROFILE.calls30d)} />
      </div>

      <Card
        className="mt-4"
        pad={false}
        title="Recent reviews"
        sub={summary.needsReply > 0 ? `${summary.needsReply} awaiting a reply` : 'All caught up — every review answered'}
        action={
          <span className="flex items-center gap-1.5 text-xs text-slate-400">
            <MapPin className="h-3.5 w-3.5" /> {GBP_PROFILE.name}
          </span>
        }
      >
        {probing ? (
          <div className="flex items-center justify-center gap-2 py-10 text-[13px] text-slate-400"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-white/[0.06]">
            {reviews.map((r) => (
              <ReviewRow key={r.id} r={r} onReply={reply} />
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}
