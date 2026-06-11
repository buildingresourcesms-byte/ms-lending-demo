import { useState } from 'react'
import { Building2, MapPin, Phone, Mail, BadgeCheck, AlertTriangle, Palette } from 'lucide-react'
import { useApp } from '../store.jsx'
import { OFFICERS, DISCLAIMER } from '../data.js'
import { PageHeader, Card, Avatar, Toggle, BrandMark, Badge, cx } from '../ui.jsx'

const SWATCHES = [
  { name: 'Navy', cls: 'bg-navy-800' },
  { name: 'Sage', cls: 'bg-sage-500' },
  { name: 'Teal', cls: 'bg-teal-500' },
  { name: 'Blue', cls: 'bg-blue-500' },
]

export default function Settings() {
  const { toast, go, notifPrefs, setNotifPref, theme, toggleTheme } = useApp()

  return (
    <div>
      <PageHeader title="Settings" sub="Company profile, team, and workspace preferences." />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card title="Company profile">
          <div className="flex items-center gap-3.5">
            <BrandMark className="h-12 w-12" />
            <div>
              <p className="font-display text-lg font-semibold text-navy-900">MS Lending, LLC</p>
              <p className="text-xs italic text-slate-400">
                “We’re making getting a mortgage easier than ever before.”
              </p>
            </div>
          </div>
          <ul className="mt-5 space-y-2.5 text-sm text-slate-600">
            <li className="flex items-center gap-2.5">
              <MapPin className="h-4 w-4 shrink-0 text-slate-400" /> 742 Magnolia St, Ste D · Madison, MS 39110
            </li>
            <li className="flex items-center gap-2.5">
              <Phone className="h-4 w-4 shrink-0 text-slate-400" /> (601) 651-3959
            </li>
            <li className="flex items-center gap-2.5">
              <Mail className="h-4 w-4 shrink-0 text-slate-400" /> michelle@mslending.net
            </li>
            <li className="flex items-center gap-2.5">
              <BadgeCheck className="h-4 w-4 shrink-0 text-sage-500" /> NMLS #1833776 · Licensed in Mississippi
            </li>
          </ul>
        </Card>

        <Card title="The team" sub="Michelle & Julene are real; Lauren, Dana & Katie are sample teammates for this demo.">
          <ul className="space-y-1">
            {OFFICERS.map((o) => (
              <li key={o.id}>
                <button
                  onClick={() => go('profile', { id: o.id })}
                  className="-mx-2 flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-slate-50"
                >
                  <Avatar officer={o} size="h-10 w-10 text-xs" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-navy-900">{o.name}</p>
                    <p className="truncate text-xs text-slate-400">{o.role}</p>
                  </div>
                  <Badge
                    cls={o.id === 'michelle' || o.id === 'julene' ? 'bg-navy-100 text-navy-700' : 'bg-slate-100 text-slate-500'}
                  >
                    {o.nmls}
                  </Badge>
                </button>
              </li>
            ))}
          </ul>
        </Card>

        <Card title="Notifications" sub="What shows in your 🔔 and how the workspace keeps you on top of things.">
          <ul className="space-y-4">
            {[
              ['applyLeads', 'New leads from your apply link', 'The moment someone applies through your link', true],
              ['overdue', 'Overdue follow-up alerts', 'When a lead has gone quiet too long', true],
              ['tasks', 'Tasks due today', 'Your calls and to-dos as they come due', true],
              ['rateLocks', 'Rate lock expiring', 'Warn me before a borrower’s rate lock runs out', true],
              ['digest', 'Morning task digest', 'A friendly 8am email with today’s calls & follow-ups', false],
              ['weekly', 'Weekly pipeline summary', 'Monday-morning snapshot of every active file', false],
            ].map(([key, label, sub, inBell]) => (
              <li key={key} className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
                    {label}
                    {inBell && (
                      <span className="rounded bg-navy-50 px-1.5 py-px text-[10px] font-semibold text-navy-600 ring-1 ring-inset ring-navy-600/15">
                        in bell
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-slate-400">{sub}</p>
                </div>
                <Toggle on={notifPrefs[key]} onChange={(v) => setNotifPref(key, v)} />
              </li>
            ))}
          </ul>
        </Card>

        <Card title="Appearance" sub="Make it feel like yours.">
          <div className="mb-5 flex items-center justify-between gap-4 border-b border-slate-100 pb-4 dark:border-white/10">
            <div>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Dark mode</p>
              <p className="text-xs text-slate-400">Easier on the eyes for late-night files</p>
            </div>
            <Toggle on={theme === 'dark'} onChange={() => toggleTheme()} />
          </div>
          <div className="flex items-center gap-3">
            {SWATCHES.map((s) => (
              <button
                key={s.name}
                title={s.name}
                onClick={() => toast('Theme colors are customizable in the full version', '🎨')}
                className={cx(
                  'h-10 w-10 rounded-full ring-2 ring-white shadow-md transition hover:scale-110',
                  s.cls,
                )}
              />
            ))}
            <Palette className="ml-2 h-5 w-5 text-slate-300" />
          </div>
          <p className="mt-4 text-xs text-slate-400">
            Logo, colors, and the borrower portal can all carry MS Lending’s branding.
          </p>
        </Card>
      </div>

      {/* compliance note */}
      <div className="mt-4 flex flex-wrap items-start gap-3 rounded-2xl bg-amber-50 p-5 ring-1 ring-amber-200/70">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-amber-800">{DISCLAIMER}</p>
          <p className="mt-1 text-xs leading-relaxed text-amber-700">
            Every borrower, phone number, loan amount, and document in this workspace is fictional sample
            data. This is a concept prototype built to show MS Lending what a custom loan workspace could
            feel like — security, compliance, and real integrations would come with the production build.
          </p>
        </div>
      </div>
    </div>
  )
}
