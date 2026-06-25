import { ArrowRight } from 'lucide-react'
import { useApp } from '../store.jsx'
import { OFFICERS, DISCLAIMER, timeOfDay, SKY } from '../data.js'
import { BrandMark, Avatar, PoweredBySolvyr, cx } from '../ui.jsx'
import { Reveal } from '../effects.jsx'

function SignInRow({ o, onClick }) {
  return (
    <button
      onClick={onClick}
      className="group flex w-full items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-3 text-left transition-colors hover:border-white/20 hover:bg-white/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-400/50"
    >
      <Avatar officer={o} size="h-10 w-10 text-xs" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-white">{o.name}</p>
        <p className="truncate text-xs text-navy-300">{o.role}</p>
      </div>
      <ArrowRight className="h-4 w-4 shrink-0 text-navy-400 transition-all group-hover:translate-x-0.5 group-hover:text-sage-300" />
    </button>
  )
}

export default function Landing() {
  const { signIn } = useApp()
  const julene = OFFICERS.find((o) => o.id === 'julene') ?? OFFICERS[0]
  const accent = SKY[timeOfDay()].accent

  return (
    <div className="relative grid min-h-screen place-items-center overflow-hidden bg-gradient-to-br from-navy-950 via-navy-900 to-navy-800 px-4 py-10">
      {/* ambient aurora (sign-in splash only) */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-72"
        style={{ background: `radial-gradient(80% 60% at 50% 0%, ${accent}, transparent 70%)` }}
      />
      <div className="aurora-blob -left-16 top-10 h-72 w-72 bg-sage-500/40" aria-hidden="true" />
      <div className="aurora-blob -right-20 bottom-0 h-80 w-80 bg-navy-500/40" style={{ animationDelay: '-6s' }} aria-hidden="true" />
      <div className="aurora-blob left-1/3 -bottom-24 h-72 w-72 bg-sage-400/25" style={{ animationDelay: '-12s' }} aria-hidden="true" />

      <div className="relative w-full max-w-md">
        {/* brand */}
        <Reveal className="text-center">
          <BrandMark className="mx-auto h-14 w-14" />
          <h1 className="font-display brand-shine mt-4 text-2xl font-semibold text-white">MS Lending</h1>
          <p className="text-sm text-navy-300">Loan Workspace</p>
          <p className="mx-auto mt-3 max-w-xs text-[13px] leading-relaxed text-navy-200">
            “We’re making getting a mortgage easier than ever before.”
          </p>
        </Reveal>

        {/* sign-in card */}
        <Reveal delay={120} className="mt-7 rounded-2xl border border-white/10 bg-white/5 p-4 shadow-[0_24px_60px_-12px_rgba(0,0,0,0.5)]">
          <p className="px-1 pb-2 text-[11px] font-semibold uppercase tracking-wider text-navy-400">Sign in</p>
          <SignInRow o={julene} onClick={() => signIn(julene.id)} />
        </Reveal>

        <Reveal delay={220}>
          <p className="mx-auto mt-5 max-w-xs text-center text-[10px] leading-relaxed text-navy-500">{DISCLAIMER}</p>
          <PoweredBySolvyr tone="dark" className="mt-2" />
        </Reveal>
      </div>
    </div>
  )
}
