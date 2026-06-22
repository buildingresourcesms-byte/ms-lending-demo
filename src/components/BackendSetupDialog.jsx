import { useState } from 'react'
import { AlertCircle, Check, Copy, ExternalLink, KeyRound, ServerCog, Webhook } from 'lucide-react'
import { Badge, Btn, LinkBtn, Modal } from '../ui.jsx'

const AUTH_LABEL = { oauth2: 'OAuth 2.0', api_key: 'Server credentials', webhook: 'Signed webhook' }

function Step({ number, done, title, children }) {
  return (
    <li className="flex gap-3">
      <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-semibold ${done ? 'bg-sage-100 text-sage-700' : 'bg-navy-100 text-navy-700 dark:bg-white/10 dark:text-white'}`}>
        {done ? <Check className="h-3.5 w-3.5" strokeWidth={2.5} /> : number}
      </span>
      <div className="min-w-0 flex-1 pt-0.5">
        <h3 className="text-sm font-semibold text-navy-950 dark:text-white">{title}</h3>
        <div className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{children}</div>
      </div>
    </li>
  )
}

export default function BackendSetupDialog({ integration, connectorState, onClose }) {
  const [copied, setCopied] = useState(null)
  const state = connectorState || {}
  const configured = !!state.appConfigured
  const connected = !!state.connected
  const copy = async (key, value) => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(key)
      setTimeout(() => setCopied(null), 1600)
    } catch {
      setCopied(null)
    }
  }

  return (
    <Modal open wide onClose={onClose} title={`${integration.name} backend`} sub="The adapter is implemented; these are the provider-specific values needed to activate it.">
      <div className="mb-5 flex flex-wrap gap-2">
        <Badge cls="bg-navy-100 text-navy-700 dark:bg-white/10 dark:text-white"><ServerCog className="h-3 w-3" /> Adapter ready</Badge>
        <Badge cls={configured ? 'bg-sage-50 text-sage-700 ring-sage-600/20' : 'bg-amber-50 text-amber-700 ring-amber-600/20'}>
          <KeyRound className="h-3 w-3" /> {configured ? 'Credentials present' : 'Credentials needed'}
        </Badge>
        <Badge cls="bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300">{AUTH_LABEL[state.authType] || state.authType}</Badge>
      </div>

      <ol className="space-y-5">
        <Step number="1" done title="Server adapter and action contract">
          <p>Implemented actions: <span className="font-mono">{(state.actions || []).join(' · ') || 'inbound events'}</span></p>
          <p className="mt-1">Capabilities: {(state.capabilities || []).join(' · ')}</p>
        </Step>

        <Step number="2" done={configured} title="Add provider credentials">
          {configured ? (
            <p className="font-medium text-sage-700 dark:text-sage-300">Every required environment value is present.</p>
          ) : (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-amber-800 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-200">
              <p className="flex items-center gap-1.5 font-semibold"><AlertCircle className="h-3.5 w-3.5" /> Required environment values</p>
              <p className="mt-1 break-words font-mono text-[11px]">{(state.missing || []).join(' · ')}</p>
            </div>
          )}
          <div className="mt-2 flex flex-wrap gap-2">
            {state.docsUrl && <LinkBtn href={state.docsUrl} target="_blank" rel="noreferrer" variant="outline" sm>Provider documentation <ExternalLink className="h-3 w-3" /></LinkBtn>}
            <LinkBtn href="https://vercel.com/dashboard" target="_blank" rel="noreferrer" variant="outline" sm>Vercel environment <ExternalLink className="h-3 w-3" /></LinkBtn>
          </div>
        </Step>

        {state.authType === 'oauth2' && (
          <Step number="3" done={connected} title={`Authorize ${integration.name}`}>
            <p>Register this exact redirect URI with the provider:</p>
            <div className="mt-2 flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2.5 dark:border-white/10 dark:bg-white/5">
              <code className="min-w-0 flex-1 break-all text-[11px] text-navy-700 dark:text-slate-300">{state.suggestedCallbackUrl}</code>
              <Btn variant="ghost" sm aria-label="Copy callback URL" onClick={() => copy('callback', state.suggestedCallbackUrl)}>{copied === 'callback' ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}</Btn>
            </div>
            {configured && !connected && <LinkBtn href={state.connectUrl} variant="sage" sm className="mt-2">Continue to provider sign-in <ExternalLink className="h-3 w-3" /></LinkBtn>}
            {connected && <p className="mt-2 font-medium text-sage-700 dark:text-sage-300">OAuth connection is active.</p>}
          </Step>
        )}

        {state.webhook && (
          <Step number={state.authType === 'oauth2' ? '4' : '3'} done={configured} title="Configure inbound webhooks">
            <p>Point the provider webhook at this signed ingestion route:</p>
            <div className="mt-2 flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2.5 dark:border-white/10 dark:bg-white/5">
              <Webhook className="h-3.5 w-3.5 shrink-0" />
              <code className="min-w-0 flex-1 break-all text-[11px] text-navy-700 dark:text-slate-300">{state.suggestedWebhookUrl}</code>
              <Btn variant="ghost" sm aria-label="Copy webhook URL" onClick={() => copy('webhook', state.suggestedWebhookUrl)}>{copied === 'webhook' ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}</Btn>
            </div>
          </Step>
        )}
      </ol>

      {state.approval && <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-800 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-200"><span className="font-semibold">Provider limitation:</span> {state.approval}</div>}
    </Modal>
  )
}
