import { useMemo, useState } from 'react'
import {
  Home,
  Send,
  FileText,
  Link2,
  HeartHandshake,
  LogOut,
  Sparkles,
} from 'lucide-react'
import { useApp } from './store.jsx'
import { agentById, agentDeals, agentTier, officerById, AGENTS, DISCLAIMER, isClosedOut } from './data.js'
import { BrandMark, cx } from './ui.jsx'
import {
  AgentStatsHero,
  BuyerTracker,
  ReferralCard,
  ReferralLedger,
  ReciprocityLedger,
  ActivityFeed,
  TierCard,
  LetterGenerator,
  LinkCard,
  LenderCard,
} from './pages/AgentPortal.jsx'

const TABS = [
  { id: 'buyers', label: 'My Buyers', icon: Home },
  { id: 'refer', label: 'Refer', icon: Send },
  { id: 'letters', label: 'Letters', icon: FileText },
  { id: 'link', label: 'My Link', icon: Link2 },
  { id: 'lender', label: 'My Lender', icon: HeartHandshake },
]

/* The agent partner's own program — their buyers, their referrals,
   their letters. No LO clutter, no settings, nothing to learn. */
export default function AgentShell() {
  const { borrowers, agentSeat, signOut, toast } = useApp()
  const agent = agentById(agentSeat) ?? AGENTS[0]
  const officer = officerById('julene')
  const [tab, setTab] = useState('buyers')
  const deals = useMemo(() => agentDeals(borrowers, agent.id), [borrowers, agent.id])
  const activeCount = deals.filter((b) => !isClosedOut(b)).length
  const tier = agentTier(borrowers, agent.id)

  return (
    <div className="min-h-screen">
      {/* co-branded agent topbar */}
      <header className="sticky top-0 z-30 border-b border-white/10 bg-navy-950">
        <div className="mx-auto flex h-[56px] max-w-3xl items-center gap-3 px-4">
          <BrandMark className="h-8 w-8" />
          <span className="text-sm font-light text-navy-400">×</span>
          <span className={cx('grid h-8 w-8 shrink-0 place-items-center rounded-lg text-[11px] font-semibold text-white', agent.color)}>
            {agent.initials}
          </span>
          <div className="min-w-0">
            <p className="truncate text-[13px] font-semibold leading-4 text-white">
              {agent.name} <span className="ml-1 text-[11px] font-normal">{tier.chip}</span>
            </p>
            <p className="truncate text-[11px] leading-4 text-navy-400">{agent.brokerage} · {tier.label}</p>
          </div>
          <button
            onClick={signOut}
            className="ml-auto flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-navy-200 transition-colors hover:bg-white/10 hover:text-white"
          >
            <LogOut className="h-3.5 w-3.5" /> Sign out
          </button>
        </div>
        {/* tab nav (desktop & tablet) */}
        <nav className="mx-auto hidden max-w-3xl items-center gap-1 px-4 pb-2 sm:flex">
          {TABS.map((t) => {
            const Icon = t.icon
            const active = tab === t.id
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cx(
                  'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors',
                  active ? 'bg-white/10 text-white' : 'text-navy-300 hover:bg-white/[0.06] hover:text-white',
                )}
              >
                <Icon className="h-3.5 w-3.5" strokeWidth={active ? 2.2 : 1.75} />
                {t.label}
                {t.id === 'buyers' && activeCount > 0 && (
                  <span className="rounded bg-sage-500/20 px-1 text-[10px] font-semibold text-sage-300 tabular-nums">
                    {activeCount}
                  </span>
                )}
              </button>
            )
          })}
        </nav>
      </header>

      <main className="mx-auto max-w-3xl space-y-4 px-4 pb-24 pt-5 sm:pb-10">
        {tab === 'buyers' && (
          <>
            <AgentStatsHero agent={agent} deals={deals} />
            <BuyerTracker deals={deals} />
            <ActivityFeed deals={deals} />
          </>
        )}
        {tab === 'refer' && (
          <>
            <ReferralCard agent={agent} officer={officer} />
            <ReciprocityLedger agent={agent} officer={officer} deals={deals} />
            <ReferralLedger deals={deals} />
          </>
        )}
        {tab === 'letters' && <LetterGenerator deals={deals} officer={officer} toast={toast} />}
        {tab === 'link' && <LinkCard agent={agent} officer={officer} toast={toast} />}
        {tab === 'lender' && (
          <>
            <TierCard borrowers={borrowers} agent={agent} />
            <LenderCard officer={officer} toast={toast} />
          </>
        )}

        <div className="space-y-1.5 pb-2 pt-2 text-center">
          <p className="flex items-center justify-center gap-1.5 text-xs text-slate-400">
            <Sparkles className="h-3.5 w-3.5 text-sage-500" /> Partners since {agent.since} · {agent.market}, Mississippi
          </p>
          <p className="text-[10px] text-slate-300">{DISCLAIMER}</p>
        </div>
      </main>

      {/* mobile bottom nav */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur-sm sm:hidden dark:border-white/10 dark:bg-navy-950/95"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="mx-auto flex max-w-md items-stretch justify-around">
          {TABS.map((t) => {
            const Icon = t.icon
            const active = tab === t.id
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cx(
                  'relative flex min-h-[3.25rem] flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors',
                  active ? 'text-navy-800 dark:text-white' : 'text-slate-400',
                )}
              >
                {active && <span className="absolute top-0 h-0.5 w-8 rounded-full bg-sage-500" />}
                <Icon className="h-5 w-5" strokeWidth={active ? 2.2 : 1.75} />
                {t.label}
              </button>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
