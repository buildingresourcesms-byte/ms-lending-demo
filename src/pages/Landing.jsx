import { ArrowRight, Users } from 'lucide-react'
import { useApp } from '../store.jsx'
import { OFFICERS, DISCLAIMER, timeOfDay, SKY } from '../data.js'
import { BrandMark, Avatar, cx } from '../ui.jsx'

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

function SignInChip({ o, onClick }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-2 text-left transition-colors hover:bg-white/[0.07] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-400/50"
    >
      <span className={cx('grid h-7 w-7 shrink-0 place-items-center rounded-full text-[10px] font-semibold text-white', o.color)}>
        {o.initials}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-xs font-medium text-white">{o.name.split(' ')[0]}</span>
        <span className="block truncate text-[10px] text-navy-400">{o.role.split(' ')[0]}</span>
      </span>
    </button>
  )
}

export default function Landing() {
  const { signIn } = useApp()
  const featured = ['julene', 'michelle'].map((id) => OFFICERS.find((o) => o.id === id))
  const others = OFFICERS.filter((o) => !['julene', 'michelle'].includes(o.id))
  const accent = SKY[timeOfDay()].accent

  return (
    <div className="relative grid min-h-screen place-items-center overflow-hidden bg-gradient-to-br from-navy-950 via-navy-900 to-navy-800 px-4 py-10">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-72"
        style={{ background: `radial-gradient(80% 60% at 50% 0%, ${accent}, transparent 70%)` }}
      />
      <div className="relative w-full max-w-md">
        {/* brand */}
        <div className="text-center">
          <BrandMark className="mx-auto h-14 w-14" />
          <h1 className="font-display mt-4 text-2xl font-semibold text-white">MS Lending</h1>
          <p className="text-sm text-navy-300">Loan Workspace</p>
          <p className="mx-auto mt-3 max-w-xs text-[13px] leading-relaxed text-navy-200">
            “We’re making getting a mortgage easier than ever before.”
          </p>
        </div>

        {/* sign-in card */}
        <div className="mt-7 rounded-2xl border border-white/10 bg-white/5 p-4 shadow-[0_24px_60px_-12px_rgba(0,0,0,0.5)]">
          <p className="px-1 pb-2 text-[11px] font-semibold uppercase tracking-wider text-navy-400">Sign in as</p>
          <div className="space-y-2">
            {featured.map((o) => (
              <SignInRow key={o.id} o={o} onClick={() => signIn(o.id)} />
            ))}
          </div>

          <p className="px-1 pb-2 pt-4 text-[11px] font-semibold uppercase tracking-wider text-navy-400">Team</p>
          <div className="grid grid-cols-3 gap-2">
            {others.map((o) => (
              <SignInChip key={o.id} o={o} onClick={() => signIn(o.id)} />
            ))}
          </div>

          <button
            onClick={() => signIn('team')}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-[13px] font-medium text-navy-200 transition-colors hover:bg-white/5 hover:text-white"
          >
            <Users className="h-3.5 w-3.5" /> View the whole team
          </button>
        </div>

        <p className="mx-auto mt-5 max-w-xs text-center text-[10px] leading-relaxed text-navy-500">{DISCLAIMER}</p>
      </div>
    </div>
  )
}
