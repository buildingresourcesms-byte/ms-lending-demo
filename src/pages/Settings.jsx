import { useState } from 'react'
import { Building2, MapPin, Phone, Mail, BadgeCheck, AlertTriangle, Check, RotateCcw, Loader2, ExternalLink } from 'lucide-react'
import { useApp } from '../store.jsx'
import { OFFICERS, DISCLAIMER } from '../data.js'
import { PageHeader, Card, Avatar, Toggle, BrandMark, Badge, Btn, Field, inputCls, cx } from '../ui.jsx'

/* ---- connect a real email account (EmailJS — sends from the browser, no backend) ---- */
function EmailSetupCard() {
  const { emailCfg, setEmailCfg, emailReady, sendTestEmail, toast } = useApp()
  const [form, setForm] = useState(emailCfg ?? { serviceId: '', templateId: '', publicKey: '', replyTo: '' })
  const [testing, setTesting] = useState(false)
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  const filled = form.serviceId.trim() && form.templateId.trim() && form.publicKey.trim()

  const save = () => {
    setEmailCfg({
      serviceId: form.serviceId.trim(),
      templateId: form.templateId.trim(),
      publicKey: form.publicKey.trim(),
      replyTo: form.replyTo.trim(),
    })
    toast('Email connected — you can now send for real 📧', '📧')
  }
  const disconnect = () => {
    setEmailCfg(null)
    setForm({ serviceId: '', templateId: '', publicKey: '', replyTo: '' })
    toast('Email disconnected', '✓')
  }
  const test = async () => {
    setTesting(true)
    try {
      await sendTestEmail({ ...form, serviceId: form.serviceId.trim(), templateId: form.templateId.trim(), publicKey: form.publicKey.trim() })
      toast('Test email sent — check your inbox ✓', '📧')
    } catch {
      toast('Test failed — double-check your 3 IDs', '⚠️')
    } finally {
      setTesting(false)
    }
  }

  return (
    <Card
      title="Email sending"
      sub="Send real emails to borrowers from your own address — no IT, no password shared here."
      action={
        emailReady ? (
          <Badge cls="bg-sage-50 text-sage-700 ring-sage-600/20" dot="bg-sage-500">Connected</Badge>
        ) : (
          <Badge cls="bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-slate-300">Not connected</Badge>
        )
      }
    >
      {!emailReady && (
        <ol className="mb-4 space-y-1.5 rounded-lg bg-slate-50/60 p-3 text-xs leading-relaxed text-slate-500 dark:bg-white/5">
          <li>
            1. Make a free account at{' '}
            <a href="https://www.emailjs.com" target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 font-medium text-navy-600 underline dark:text-slate-200">
              emailjs.com <ExternalLink className="h-3 w-3" />
            </a>{' '}
            and connect your Gmail or Outlook.
          </li>
          <li>
            2. Create an email template using these exact variables:
            <br />
            <span className="font-mono text-[11px] text-slate-600 dark:text-slate-300">{'{{to_name}} {{to_email}} {{subject}} {{message}} {{from_name}} {{reply_to}}'}</span>
          </li>
          <li>3. Copy your Service ID, Template ID, and Public Key in below.</li>
        </ol>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Service ID"><input className={inputCls} value={form.serviceId} onChange={set('serviceId')} placeholder="service_xxxxxxx" /></Field>
        <Field label="Template ID"><input className={inputCls} value={form.templateId} onChange={set('templateId')} placeholder="template_xxxxxxx" /></Field>
        <Field label="Public Key"><input className={inputCls} value={form.publicKey} onChange={set('publicKey')} placeholder="xxxxxxxxxxxxxxxx" /></Field>
        <Field label="Reply-to (optional)"><input className={inputCls} value={form.replyTo} onChange={set('replyTo')} placeholder="julene@mslending.net" /></Field>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-[11px] text-slate-400">
          <BadgeCheck className="h-3.5 w-3.5 text-sage-500" /> Your password never touches this app — EmailJS holds the connection.
        </p>
        <div className="flex gap-2">
          {emailReady && <Btn variant="ghost" sm onClick={disconnect}>Disconnect</Btn>}
          <Btn variant="outline" sm onClick={test} disabled={!filled || testing}>
            {testing ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Sending…</> : <><Mail className="h-3.5 w-3.5" /> Send test</>}
          </Btn>
          <Btn variant="sage" sm onClick={save} disabled={!filled}><Check className="h-3.5 w-3.5" /> Save</Btn>
        </div>
      </div>
    </Card>
  )
}

/* selectable themes — preview colors are fixed hexes so every swatch
   shows its own colors no matter which theme is active */
const THEMES = [
  { id: 'classic', emoji: '🏛️', name: 'Classic', ink: '#24314a', accent: '#478b5b', canvas: '#f7f8fb' },
  { id: 'magnolia', emoji: '🌸', name: 'Magnolia', ink: '#1c3a2b', accent: '#bf9232', canvas: '#f8f7f2' },
  { id: 'fall', emoji: '🍂', name: 'Fall', ink: '#3a2418', accent: '#cf6a1f', canvas: '#faf6f0' },
  { id: 'coastal', emoji: '🌊', name: 'Coastal', ink: '#11303f', accent: '#d14e34', canvas: '#f4f9fa' },
  { id: 'frost', emoji: '❄️', name: 'Frost', ink: '#20263d', accent: '#348e98', canvas: '#f6f8fb' },
]

export default function Settings() {
  const { toast, go, notifPrefs, setNotifPref, theme, toggleTheme, palette, setPalette, resetDemo } = useApp()

  return (
    <div>
      <PageHeader title="Settings" sub="Company profile, team, and workspace preferences." />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="lg:col-span-2">
          <EmailSetupCard />
        </div>
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
          <p className="mb-2.5 text-sm font-medium text-slate-700 dark:text-slate-200">Theme</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {THEMES.map((t) => {
              const active = palette === t.id
              return (
                <button
                  key={t.id}
                  onClick={() => {
                    setPalette(t.id)
                    toast(`${t.name} theme on`, t.emoji)
                  }}
                  aria-pressed={active}
                  className={cx(
                    'rounded-xl border p-2 text-left transition-all duration-150 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-500/40',
                    active
                      ? 'border-navy-800 ring-1 ring-navy-800 dark:border-white/60 dark:ring-white/60'
                      : 'border-slate-200 hover:border-slate-300 dark:border-white/10 dark:hover:border-white/25',
                  )}
                >
                  {/* mini preview */}
                  <span
                    className="flex h-9 items-center gap-1.5 rounded-lg px-2 ring-1 ring-black/[0.05]"
                    style={{ backgroundColor: t.canvas }}
                  >
                    <span className="h-4 w-4 rounded-full" style={{ backgroundColor: t.ink }} />
                    <span className="h-3 w-3 rounded-full" style={{ backgroundColor: t.accent }} />
                    <span className="ml-auto h-1.5 w-7 rounded-full" style={{ backgroundColor: t.ink, opacity: 0.25 }} />
                  </span>
                  <span className="mt-1.5 flex items-center justify-between px-0.5">
                    <span className="text-xs font-medium text-slate-700 dark:text-slate-200">
                      {t.emoji} {t.name}
                    </span>
                    {active && <Check className="h-3.5 w-3.5 text-sage-600" strokeWidth={2.5} />}
                  </span>
                </button>
              )
            })}
          </div>
          <p className="mt-4 text-xs text-slate-400">
            Your pick is saved on this device — colors, sidebar, even the logo follow the theme.
          </p>
        </Card>

        <Card title="Your data" sub="Everything you do here is saved on this device automatically.">
          <ul className="space-y-2 text-[13px] text-slate-600 dark:text-slate-300">
            <li className="flex items-start gap-2">
              <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-sage-600" strokeWidth={2.5} /> New leads, messages, tasks & notes persist across reloads
            </li>
            <li className="flex items-start gap-2">
              <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-sage-600" strokeWidth={2.5} /> Theme, layout & connections remembered
            </li>
          </ul>
          <div className="mt-4 flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50/60 p-3 dark:border-white/10 dark:bg-white/5">
            <div className="min-w-0">
              <p className="text-[13px] font-medium text-slate-700 dark:text-slate-200">Reset demo data</p>
              <p className="text-xs text-slate-400">Wipe your changes and reload the fresh sample.</p>
            </div>
            <Btn
              variant="outline"
              onClick={() => {
                if (confirm('Reset the demo to its original sample data? This clears anything you’ve added on this device.')) resetDemo()
              }}
            >
              <RotateCcw className="h-3.5 w-3.5" /> Reset
            </Btn>
          </div>
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
