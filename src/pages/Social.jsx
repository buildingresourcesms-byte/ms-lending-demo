import { useCallback, useEffect, useState } from 'react'
import {
  Share2,
  RefreshCw,
  Heart,
  MessageCircle,
  Repeat2,
  Eye,
  Users,
  TrendingUp,
  FileText,
  Plug,
  ExternalLink,
  Check,
  Loader2,
} from 'lucide-react'
import { SOCIAL_ACCOUNTS, SOCIAL_POSTS, socialSummary, relDate } from '../data.js'
import { integrationBackendStatus } from '../api.js'
import { INTEGRATION_ICONS } from './Integrations.jsx'
import { PageHeader, Card, Stat, Btn, LinkBtn, Badge, cx } from '../ui.jsx'
import { Reveal } from '../effects.jsx'

const PLATFORM = Object.fromEntries(SOCIAL_ACCOUNTS.map((a) => [a.id, a]))
const tint = (hex) => hex + '20'
const fmt = (n) => Number(n || 0).toLocaleString('en-US')

function Brand({ id, size = 'h-9 w-9', icon = 'h-4 w-4' }) {
  const a = PLATFORM[id] || {}
  const Icon = INTEGRATION_ICONS[a.icon] ?? Share2
  return (
    <span className={cx('grid shrink-0 place-items-center rounded-xl', size)} style={{ backgroundColor: tint(a.color || '#64748b') }}>
      <Icon className={icon} style={{ color: a.color }} strokeWidth={2} />
    </span>
  )
}

/* one connectable account */
function AccountCard({ account, state }) {
  const connected = !!state?.connected
  const configured = !!state?.appConfigured
  return (
    <article className={cx('flex items-center gap-3 rounded-xl border bg-white p-3.5 dark:bg-white/[0.03]', connected ? 'border-sage-300/80 dark:border-sage-500/30' : 'border-slate-200/80 dark:border-white/10')}>
      <Brand id={account.id} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-semibold text-navy-950 dark:text-white">{account.name}</p>
          {connected && <Badge cls="bg-sage-50 text-sage-700 ring-sage-600/20" dot="bg-sage-500">Connected</Badge>}
        </div>
        <p className="truncate text-xs text-slate-500">{account.handle} · {fmt(account.followers)} followers</p>
      </div>
      {connected ? (
        <span className="flex items-center gap-1 text-xs font-medium text-sage-700"><Check className="h-3.5 w-3.5" /> Live</span>
      ) : configured && state?.connectUrl ? (
        <LinkBtn href={state.connectUrl} variant="sage" sm><Plug className="h-3 w-3" /> Connect</LinkBtn>
      ) : (
        <Btn variant="outline" sm onClick={() => (window.location.hash = '')} disabled title="Set up this connector in Integrations first">
          Connect
        </Btn>
      )}
    </article>
  )
}

function PostCard({ post }) {
  const a = PLATFORM[post.platform] || {}
  const Icon = INTEGRATION_ICONS[a.icon] ?? Share2
  const eng = (post.likes || 0) + (post.comments || 0) + (post.shares || 0)
  const rate = post.reach ? Math.round((eng / post.reach) * 1000) / 10 : 0
  return (
    <article className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)] dark:border-white/10 dark:bg-white/[0.03]">
      <div className={cx('relative h-24 bg-gradient-to-br', post.tone || 'from-slate-300 to-slate-200')}>
        <span className="absolute left-2.5 top-2.5 grid h-7 w-7 place-items-center rounded-lg bg-white/85 shadow-sm">
          <Icon className="h-3.5 w-3.5" style={{ color: a.color }} strokeWidth={2.25} />
        </span>
        <span className="absolute right-2.5 top-2.5 rounded-md bg-black/25 px-1.5 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm">
          {relDate(String(post.date).slice(0, 10))}
        </span>
      </div>
      <div className="p-3.5">
        <p className="line-clamp-2 min-h-[2.5rem] text-[13px] leading-snug text-navy-900 dark:text-slate-100">{post.caption}</p>
        <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2.5 dark:border-white/10">
          <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1"><Heart className="h-3.5 w-3.5 text-rose-500" /> {fmt(post.likes)}</span>
            <span className="flex items-center gap-1"><MessageCircle className="h-3.5 w-3.5 text-sky-500" /> {fmt(post.comments)}</span>
            <span className="flex items-center gap-1"><Repeat2 className="h-3.5 w-3.5 text-sage-600" /> {fmt(post.shares)}</span>
          </div>
          <span className="flex items-center gap-1 text-[11px] font-medium text-slate-400" title={`${fmt(post.reach)} reached`}>
            <Eye className="h-3 w-3" /> {fmt(post.reach)} · {rate}%
          </span>
        </div>
      </div>
    </article>
  )
}

export default function Social() {
  const [backend, setBackend] = useState(null)
  const [loading, setLoading] = useState(true)
  const sum = socialSummary()

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setBackend(await integrationBackendStatus({ refresh: true }))
    } finally {
      setLoading(false)
    }
  }, [])
  useEffect(() => {
    load()
  }, [load])

  const conn = backend?.connectors || {}
  const anyLive = SOCIAL_ACCOUNTS.some((a) => conn[a.id]?.connected)

  return (
    <div>
      <PageHeader
        title="Social"
        sub="Connect your accounts, see your posts, and track engagement — all in one place."
        actions={<Btn variant="outline" onClick={load} disabled={loading}><RefreshCw className={cx('h-3.5 w-3.5', loading && 'animate-spin')} /> Refresh</Btn>}
      />

      {!anyLive && (
        <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-amber-200/70 bg-amber-50 px-3.5 py-2.5 text-[13px] text-amber-800 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-200">
          <TrendingUp className="mt-0.5 h-4 w-4 shrink-0" />
          <p><span className="font-semibold">Showing sample analytics.</span> Connect an account below and your real posts &amp; metrics replace these automatically. (Facebook/Instagram need Meta’s app approval to pull live data.)</p>
        </div>
      )}

      {/* connect accounts */}
      <Reveal>
        <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {SOCIAL_ACCOUNTS.map((a) => (
            <AccountCard key={a.id} account={a} state={conn[a.id]} />
          ))}
        </div>
      </Reveal>

      {/* summary metrics */}
      <Reveal delay={80}>
        <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat icon={Users} label="Followers" value={fmt(sum.followers)} accent="sky" />
          <Stat icon={Eye} label="Reach · 30 days" value={fmt(sum.reach)} accent="violet" />
          <Stat icon={TrendingUp} label="Engagement rate" value={`${sum.engagementRate}%`} accent="sage" />
          <Stat icon={FileText} label="Posts · 30 days" value={String(sum.posts)} accent="amber" />
        </div>
      </Reveal>

      {/* posts */}
      <h2 className="mb-2.5 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
        <Share2 className="h-3.5 w-3.5" /> Recent posts
      </h2>
      <Reveal delay={140}>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {SOCIAL_POSTS.map((p) => (
            <PostCard key={p.id} post={p} />
          ))}
        </div>
      </Reveal>
    </div>
  )
}
