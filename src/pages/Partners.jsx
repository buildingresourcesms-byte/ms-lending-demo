import { useMemo, useState } from 'react'
import {
  Building2,
  Phone,
  Mail,
  Copy,
  Check,
  Link2,
  Eye,
  TrendingUp,
  Landmark,
  UserPlus,
  Sparkles,
} from 'lucide-react'
import { useApp } from '../store.jsx'
import {
  AGENTS,
  agentDeals,
  agentApplyLink,
  officerById,
  money,
  fmtDate,
  relDate,
  isClosedOut,
  STATUS_STYLES,
} from '../data.js'
import { PageHeader, Card, Badge, StatusBadge, Btn, Avatar, EmptyState, cx } from '../ui.jsx'

const fmtK = (n) => (n >= 1000 ? '$' + Math.round(n / 1000) + 'K' : money(n))

function AgentAvatar({ agent, size = 'h-10 w-10 text-xs' }) {
  return (
    <span className={cx('grid shrink-0 place-items-center rounded-full font-semibold text-white ring-1 ring-black/[0.08]', agent.color, size)}>
      {agent.initials}
    </span>
  )
}

export default function Partners() {
  const { borrowers, seat, currentOfficer, openLoan, go, toast } = useApp()
  const officer = currentOfficer ?? officerById('julene')
  const [selectedId, setSelectedId] = useState(AGENTS[0]?.id)
  const [copied, setCopied] = useState(null)

  const partnerStats = useMemo(
    () =>
      AGENTS.map((a) => {
        const deals = agentDeals(borrowers, a.id)
        const active = deals.filter((b) => !isClosedOut(b))
        const closed = deals.filter((b) => b.status === 'Closed')
        return {
          agent: a,
          deals,
          active,
          closed,
          activeVolume: active.reduce((s, b) => s + b.amount, 0),
          closedVolume: closed.reduce((s, b) => s + b.amount, 0),
        }
      }).sort((x, z) => z.active.length - x.active.length || z.closedVolume - x.closedVolume),
    [borrowers],
  )

  const totals = {
    partners: AGENTS.length,
    activeDeals: partnerStats.reduce((s, p) => s + p.active.length, 0),
    activeVolume: partnerStats.reduce((s, p) => s + p.activeVolume, 0),
    closedVolume: partnerStats.reduce((s, p) => s + p.closedVolume, 0),
  }

  const selected = partnerStats.find((p) => p.agent.id === selectedId) ?? partnerStats[0]

  const copyLink = (a) => {
    const url = 'https://' + agentApplyLink(officer, a)
    try {
      navigator.clipboard?.writeText(url)
    } catch {
      /* demo only */
    }
    setCopied(a.id)
    toast(`Co-branded link copied — ${a.name.split(' ')[0]} gets the credit`, '🔗')
    setTimeout(() => setCopied(null), 1600)
  }

  return (
    <div>
      <PageHeader
        title="Agent Partners"
        sub="The realtors who send you business — and the live pipeline you share with them."
        actions={
          <Btn variant="outline" onClick={() => go('agentportal')}>
            <Eye className="h-4 w-4" /> Preview their portal
          </Btn>
        }
      />

      {/* network totals */}
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { icon: Building2, label: 'Agent partners', value: totals.partners, tone: 'bg-navy-50 text-navy-600' },
          { icon: TrendingUp, label: 'Shared active deals', value: totals.activeDeals, tone: 'bg-sky-50 text-sky-600' },
          { icon: Landmark, label: 'In-flight volume', value: fmtK(totals.activeVolume), tone: 'bg-amber-50 text-amber-600' },
          { icon: Sparkles, label: 'Closed together', value: fmtK(totals.closedVolume), tone: 'bg-sage-50 text-sage-700' },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)] dark:border-white/10 dark:bg-navy-900">
            <div className="flex items-center justify-between gap-2">
              <span className="truncate text-xs font-medium text-slate-500 dark:text-slate-400">{s.label}</span>
              <span className={cx('grid h-8 w-8 shrink-0 place-items-center rounded-lg', s.tone)}>
                <s.icon className="h-[18px] w-[18px]" strokeWidth={2} />
              </span>
            </div>
            <p className="mt-1.5 text-[26px] font-semibold leading-8 tracking-tight text-navy-950 tabular-nums dark:text-white">{s.value}</p>
          </div>
        ))}
      </div>

      {/* partner cards */}
      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {partnerStats.map(({ agent, active, closed, closedVolume }) => (
          <button
            key={agent.id}
            onClick={() => setSelectedId(agent.id)}
            className={cx(
              'rounded-xl border bg-white p-4 text-left shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_10px_28px_-14px_rgba(16,24,40,0.22)] dark:bg-navy-900',
              selected?.agent.id === agent.id
                ? 'border-navy-700 ring-1 ring-navy-700 dark:border-white/50 dark:ring-white/50'
                : 'border-slate-200/80 dark:border-white/10',
            )}
          >
            <div className="flex items-start gap-3">
              <AgentAvatar agent={agent} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-navy-950 dark:text-white">{agent.name}</p>
                <p className="truncate text-xs text-slate-400">
                  {agent.brokerage} · {agent.market}
                </p>
              </div>
              <Badge cls="bg-slate-50 text-slate-500 ring-slate-400/30 dark:bg-white/5 dark:text-slate-400">
                since {agent.since}
              </Badge>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 border-t border-slate-100 pt-3 text-center dark:border-white/10">
              <div>
                <p className="text-lg font-semibold text-navy-950 tabular-nums dark:text-white">{active.length}</p>
                <p className="text-[10px] text-slate-400">active</p>
              </div>
              <div>
                <p className="text-lg font-semibold text-navy-950 tabular-nums dark:text-white">{closed.length}</p>
                <p className="text-[10px] text-slate-400">closed</p>
              </div>
              <div>
                <p className="text-lg font-semibold text-navy-950 tabular-nums dark:text-white">{fmtK(closedVolume)}</p>
                <p className="text-[10px] text-slate-400">volume</p>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* selected partner detail */}
      {selected && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_18rem]">
          <Card
            title={`Deals with ${selected.agent.name.split(' ')[0]}`}
            sub="Every buyer they've sent or repped — live status, no phone tag."
            pad={false}
          >
            {selected.deals.length === 0 ? (
              <EmptyState icon={UserPlus} title="No deals yet" sub="Their referrals land here automatically." />
            ) : (
              <ul className="divide-y divide-slate-100 dark:divide-white/[0.06]">
                {selected.deals.map((b) => (
                  <li key={b.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-medium text-navy-950 dark:text-white">{b.name}</p>
                      <p className="truncate text-xs text-slate-400">
                        {money(b.amount)} · {b.loanType} {b.purpose}
                        {b.estClosing && !isClosedOut(b) && ` · closes ${relDate(b.estClosing)}`}
                      </p>
                    </div>
                    <StatusBadge status={b.status} />
                    <button
                      onClick={() => openLoan(b.id)}
                      className="text-xs font-medium text-navy-600 transition-colors hover:text-navy-900 dark:text-slate-300 dark:hover:text-white"
                    >
                      Open →
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <div className="space-y-4">
            <Card title="Reach out">
              <ul className="space-y-2.5 text-sm">
                <li className="flex items-center gap-2.5 text-slate-600 dark:text-slate-300">
                  <Phone className="h-4 w-4 shrink-0 text-slate-400" /> {selected.agent.phone}
                </li>
                <li className="flex items-center gap-2.5 text-slate-600 dark:text-slate-300">
                  <Mail className="h-4 w-4 shrink-0 text-slate-400" /> {selected.agent.email}
                </li>
              </ul>
            </Card>
            <Card title="Co-branded apply link" sub="They share it; you fund it; they get the credit.">
              <div className="flex items-center gap-2 rounded-lg border border-slate-300/70 bg-slate-50/60 px-2.5 py-2 dark:border-white/10 dark:bg-white/5">
                <Link2 className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-navy-900 dark:text-slate-200">
                  {agentApplyLink(officer, selected.agent)}
                </span>
                <Btn variant="outline" sm onClick={() => copyLink(selected.agent)}>
                  {copied === selected.agent.id ? <Check className="h-3.5 w-3.5 text-sage-600" /> : <Copy className="h-3.5 w-3.5" />}
                </Btn>
              </div>
              <Btn
                variant="soft"
                sm
                className="mt-3 w-full"
                onClick={() => go('agentportal', { id: selected.agent.id })}
              >
                <Eye className="h-3.5 w-3.5" /> See {selected.agent.name.split(' ')[0]}’s portal
              </Btn>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}
