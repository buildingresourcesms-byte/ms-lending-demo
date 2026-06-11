import { TrendingUp, Wallet, Trophy, Gauge, Landmark, Download } from 'lucide-react'
import { useApp } from '../store.jsx'
import {
  OFFICERS,
  ACTIVE_STATUSES,
  STATUS_STYLES,
  money,
  isClosedOut,
} from '../data.js'
import { PageHeader, Card, Avatar, Btn, cx } from '../ui.jsx'
import { PipelineBars, Donut } from '../charts.jsx'
import { downloadCsv } from '../csv.js'

const fmtK = (n) => (n >= 1000 ? '$' + Math.round(n / 1000) + 'K' : money(n))

function MetricTile({ icon: Icon, label, value, tone, sub }) {
  return (
    <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)] dark:border-white/10 dark:bg-navy-900">
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-xs font-medium text-slate-500 dark:text-slate-400">{label}</span>
        <span className={cx('grid h-8 w-8 shrink-0 place-items-center rounded-lg', tone)}>
          <Icon className="h-[18px] w-[18px]" strokeWidth={2} />
        </span>
      </div>
      <p className="mt-1.5 text-[26px] font-semibold leading-8 tracking-tight text-navy-950 tabular-nums dark:text-white">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-slate-400">{sub}</p>}
    </div>
  )
}

const officerStats = (list) => {
  const active = list.filter((b) => !isClosedOut(b))
  const closed = list.filter((b) => b.status === 'Closed')
  const lost = list.filter((b) => b.status === 'Lost')
  const decided = closed.length + lost.length
  return {
    active: active.length,
    pipeline: active.reduce((s, b) => s + b.amount, 0),
    closedCount: closed.length,
    closedValue: closed.reduce((s, b) => s + b.amount, 0),
    winRate: decided ? Math.round((closed.length / decided) * 100) : 0,
  }
}

export default function Reports() {
  const { borrowers, seat, currentOfficer, goBorrowers } = useApp()
  const scoped = seat === 'team' ? borrowers : borrowers.filter((b) => b.officerId === seat)
  const s = officerStats(scoped)
  const active = scoped.filter((b) => !isClosedOut(b))
  const avg = active.length ? s.pipeline / active.length : 0

  const pipeline = ACTIVE_STATUSES.map((st) => ({
    label: st,
    count: scoped.filter((b) => b.status === st).length,
    color: STATUS_STYLES[st].bar,
  }))

  const sourceCounts = Object.entries(
    scoped.reduce((acc, b) => ((acc[b.source] = (acc[b.source] ?? 0) + 1), acc), {}),
  )
    .map(([label, value]) => ({ label, value }))
    .sort((a, z) => z.value - a.value)

  const leaderboard = OFFICERS.map((o) => ({
    o,
    ...officerStats(borrowers.filter((b) => b.officerId === o.id)),
  })).sort((a, z) => z.pipeline - a.pipeline)

  const exportCsv = () => {
    const headers = ['Loan officer', 'Role', 'Active files', 'Pipeline value', 'Closed', 'Closed volume', 'Win rate %']
    const rows = leaderboard.map(({ o, active, pipeline, closedCount, closedValue, winRate }) => [
      o.name, o.role, active, pipeline, closedCount, closedValue, winRate,
    ])
    downloadCsv('ms-lending-team-report.csv', headers, rows)
  }

  return (
    <div>
      <PageHeader
        title={currentOfficer ? `${currentOfficer.name.split(' ')[0]}’s Reports` : 'Reports'}
        sub={
          currentOfficer
            ? 'Your pipeline value, closings, and conversion at a glance.'
            : 'Team pipeline value, closings, and conversion at a glance.'
        }
        actions={
          <Btn variant="outline" onClick={exportCsv} title="Download this report as a CSV">
            <Download className="h-3.5 w-3.5" /> Export
          </Btn>
        }
      />

      {/* headline metrics */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricTile icon={TrendingUp} label="Active pipeline" value={fmtK(s.pipeline)} tone="bg-navy-50 text-navy-600" sub={`${s.active} active files`} />
        <MetricTile icon={Wallet} label="Closed volume" value={fmtK(s.closedValue)} tone="bg-sage-50 text-sage-700" sub={`${s.closedCount} closed`} />
        <MetricTile icon={Trophy} label="Win rate" value={`${s.winRate}%`} tone="bg-amber-50 text-amber-600" sub="closed vs. lost" />
        <MetricTile icon={Gauge} label="Avg loan size" value={fmtK(avg)} tone="bg-violet-50 text-violet-600" sub="active files" />
      </div>

      {/* charts */}
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card title="Pipeline by stage" sub="Click a stage to see those files">
          <PipelineBars data={pipeline} onPick={(st) => goBorrowers({ status: st })} />
        </Card>
        <Card title="Lead sources" sub="Where this pipeline came from">
          {sourceCounts.length > 0 ? (
            <Donut segments={sourceCounts} />
          ) : (
            <p className="py-8 text-center text-sm text-slate-400">No leads yet.</p>
          )}
        </Card>
      </div>

      {/* team leaderboard */}
      <Card className="mt-4" title="Team performance" sub="Pipeline value and conversion by loan officer" pad={false}>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-200/70 bg-slate-50/60 text-xs font-medium text-slate-500 dark:border-white/10 dark:bg-white/5">
                <th className="px-5 py-2.5 font-medium">Loan officer</th>
                <th className="px-3 py-2.5 text-right font-medium">Active</th>
                <th className="px-3 py-2.5 text-right font-medium">Pipeline</th>
                <th className="px-3 py-2.5 text-right font-medium">Closed</th>
                <th className="px-5 py-2.5 text-right font-medium">Win rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {leaderboard.map(({ o, active, pipeline, closedCount, winRate }) => (
                <tr key={o.id} className={cx('transition-colors hover:bg-slate-50/70 dark:hover:bg-white/5', seat === o.id && 'bg-navy-50/40 dark:bg-white/[0.06]')}>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2.5">
                      <Avatar officer={o} size="h-7 w-7 text-[10px]" />
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-medium text-navy-950 dark:text-white">
                          {o.name.split(' ')[0]} {o.name.split(' ')[1]?.[0]}.
                          {seat === o.id && <span className="ml-1.5 text-[11px] font-normal text-sage-600">You</span>}
                        </p>
                        <p className="truncate text-[11px] text-slate-400">{o.role}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-right text-[13px] text-slate-600 tabular-nums">{active}</td>
                  <td className="px-3 py-3 text-right text-[13px] font-medium text-navy-900 tabular-nums dark:text-slate-100">{fmtK(pipeline)}</td>
                  <td className="px-3 py-3 text-right text-[13px] text-slate-600 tabular-nums">{closedCount}</td>
                  <td className="px-5 py-3 text-right">
                    <span className={cx('text-[13px] font-medium tabular-nums', winRate >= 50 ? 'text-sage-700' : 'text-slate-500')}>
                      {winRate}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <p className="mt-4 flex items-center gap-1.5 text-[11px] text-slate-400">
        <Landmark className="h-3.5 w-3.5" />
        Figures are based on this demo’s fictional sample data.
      </p>
    </div>
  )
}
