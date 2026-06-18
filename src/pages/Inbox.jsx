import { useMemo, useState, useEffect, useLayoutEffect, useRef } from 'react'
import { Inbox as InboxIcon, Phone, MessageSquare, Mail, ChevronLeft, Send, Plug } from 'lucide-react'
import { useApp } from '../store.jsx'
import { officerById, relDate } from '../data.js'
import { PageHeader, Card, Avatar, EmptyState, cx } from '../ui.jsx'
import { channelProvider } from './LoanFile.jsx'

const timeOf = (at) => {
  try {
    return new Date(at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  } catch {
    return ''
  }
}
const dayOf = (at) => relDate(String(at).slice(0, 10))
const unreadIn = (thread) => (thread ?? []).filter((m) => m.dir === 'in' && !m.read).length

function TypingBubble() {
  return (
    <div className="flex items-center gap-1 rounded-2xl rounded-bl-sm bg-slate-100 px-3 py-2.5 dark:bg-white/10">
      {[0, 1, 2].map((i) => (
        <span key={i} className="h-1.5 w-1.5 animate-typing rounded-full bg-slate-400" style={{ animationDelay: `${i * 0.18}s` }} />
      ))}
    </div>
  )
}

export default function Inbox() {
  const { borrowers, messages, connections, sendMessage, markRead, openLoan, seat, currentOfficer, emailReady, mailBackend, go } = useApp()
  const [selectedId, setSelectedId] = useState(null)
  const [mobileThread, setMobileThread] = useState(false)
  const [draft, setDraft] = useState('')
  const [channel, setChannel] = useState('sms')
  const [typing, setTyping] = useState(false)
  const scrollRef = useRef(null)

  const scoped = seat === 'team' ? borrowers : borrowers.filter((b) => b.officerId === seat)

  const conversations = useMemo(() => {
    return scoped
      .map((b) => {
        const thread = messages[b.id] ?? []
        if (thread.length === 0) return null
        return { b, thread, last: thread[thread.length - 1], unread: unreadIn(thread) }
      })
      .filter(Boolean)
      .sort((a, z) => (a.last.at < z.last.at ? 1 : -1))
  }, [scoped, messages])

  const active = conversations.find((c) => c.b.id === selectedId) ?? conversations[0] ?? null
  const activeId = active?.b.id
  const threadLen = active?.thread.length ?? 0

  // mark the open thread read; default the composer channel to the thread's channel
  useEffect(() => {
    if (!activeId) return
    markRead(activeId)
    if (active?.last) setChannel(active.last.channel)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId, threadLen])

  // keep the thread scrolled to the newest message (layout effect avoids
  // a flicker when the typing bubble changes the scroll height)
  useLayoutEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [activeId, threadLen, typing])

  const openConvo = (id) => {
    setSelectedId(id)
    setMobileThread(true)
    markRead(id)
  }

  const realEmail = channel === 'email' && (emailReady || !!mailBackend)
  const mailLabel = mailBackend === 'outlook' ? 'your Outlook' : mailBackend === 'gmail' ? 'your Gmail' : 'your email'

  const send = () => {
    if (!draft.trim() || !active) return
    sendMessage(active.b.id, channel, draft)
    setDraft('')
    // only fake a "typing… reply" for in-app demo channels; real emails get real replies in Gmail
    if (!realEmail) {
      setTyping(true)
      setTimeout(() => setTyping(false), 2400)
    }
  }

  const prov = active ? channelProvider(channel, connections) : null

  return (
    <div>
      <PageHeader
        title="Inbox"
        sub={
          currentOfficer
            ? `${currentOfficer.name.split(' ')[0]}’s borrower conversations — text and email, in one place.`
            : 'Every borrower conversation — text and email, in one place.'
        }
      />

      {conversations.length === 0 ? (
        <div className="rounded-xl border border-slate-200/80 bg-white dark:border-white/10 dark:bg-navy-900">
          <EmptyState icon={InboxIcon} title="No conversations yet" sub="Text or email a borrower and it shows up here." />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[20rem_1fr]">
          {/* ---- conversation list ---- */}
          <Card pad={false} className={cx('overflow-hidden', mobileThread && 'hidden lg:block')}>
            <ul className="max-h-[36rem] divide-y divide-slate-100 overflow-y-auto dark:divide-white/[0.06]">
              {conversations.map(({ b, last, unread }) => {
                const isActive = active?.b.id === b.id
                const Icon = last.channel === 'email' ? Mail : MessageSquare
                return (
                  <li key={b.id}>
                    <button
                      onClick={() => openConvo(b.id)}
                      className={cx(
                        'flex w-full items-start gap-3 px-4 py-3 text-left transition-colors',
                        isActive ? 'bg-navy-50/70 dark:bg-white/[0.06]' : 'hover:bg-slate-50/70 dark:hover:bg-white/5',
                      )}
                    >
                      <div className="relative shrink-0">
                        <Avatar officer={officerById(b.officerId)} size="h-9 w-9 text-[11px]" />
                        {unread > 0 && <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-rose-500 ring-2 ring-white dark:ring-navy-900" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className={cx('truncate text-[13px] dark:text-white', unread > 0 ? 'font-bold text-navy-950' : 'font-semibold text-navy-950')}>{b.name}</p>
                          <span className="shrink-0 text-[11px] text-slate-400">{dayOf(last.at)}</span>
                        </div>
                        <p className={cx('mt-0.5 flex items-center gap-1.5 truncate text-xs', unread > 0 ? 'font-medium text-slate-600 dark:text-slate-200' : 'text-slate-500')}>
                          <Icon className="h-3 w-3 shrink-0 text-slate-400" />
                          <span className="truncate">{last.dir === 'out' ? 'You: ' : ''}{last.body}</span>
                        </p>
                      </div>
                    </button>
                  </li>
                )
              })}
            </ul>
          </Card>

          {/* ---- conversation thread ---- */}
          {active && (
            <Card pad={false} className={cx('flex-col', mobileThread ? 'flex' : 'hidden lg:flex')}>
              {/* header with live deep-links */}
              <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 dark:border-white/10">
                <div className="flex min-w-0 items-center gap-3">
                  <button
                    onClick={() => setMobileThread(false)}
                    aria-label="Back to inbox"
                    className="-ml-1.5 rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-navy-900 lg:hidden dark:hover:bg-white/10"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <Avatar officer={officerById(active.b.officerId)} size="h-9 w-9 text-xs" />
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-semibold text-navy-950 dark:text-white">{active.b.name}</p>
                    <p className="truncate text-xs text-slate-400">{active.b.status}</p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <a href={`tel:${active.b.phone}`} title="Call (opens your phone)" className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-navy-900 dark:hover:bg-white/10 dark:hover:text-white">
                    <Phone className="h-4 w-4" strokeWidth={1.75} />
                  </a>
                  <a href={`sms:${active.b.phone}`} title="Text (opens your messages app)" className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-navy-900 dark:hover:bg-white/10 dark:hover:text-white">
                    <MessageSquare className="h-4 w-4" strokeWidth={1.75} />
                  </a>
                  <a href={`mailto:${active.b.email}`} title="Email (opens your mail app)" className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-navy-900 dark:hover:bg-white/10 dark:hover:text-white">
                    <Mail className="h-4 w-4" strokeWidth={1.75} />
                  </a>
                  <button onClick={() => openLoan(active.b.id)} className="ml-1 hidden text-xs font-medium text-navy-600 transition-colors hover:text-navy-900 sm:block dark:text-slate-300 dark:hover:text-white">
                    Open file →
                  </button>
                </div>
              </div>

              {/* messages */}
              <div ref={scrollRef} className="flex-1 space-y-1 overflow-y-auto px-4 py-4" style={{ maxHeight: '28rem', minHeight: '18rem' }}>
                {active.thread.map((m, i) => {
                  const prev = active.thread[i - 1]
                  const showDay = !prev || String(prev.at).slice(0, 10) !== String(m.at).slice(0, 10)
                  const out = m.dir === 'out'
                  return (
                    <div key={m.id ?? i}>
                      {showDay && (
                        <div className="my-3 flex items-center justify-center">
                          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-medium text-slate-400 dark:bg-white/5">{dayOf(m.at)}</span>
                        </div>
                      )}
                      <div className={cx('flex', out ? 'justify-end' : 'justify-start')}>
                        <div className={cx('animate-slidein max-w-[78%] rounded-2xl px-3.5 py-2', out ? 'rounded-br-sm bg-navy-800 text-white dark:bg-navy-700' : 'rounded-bl-sm bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-100')}>
                          <p className="whitespace-pre-wrap text-[13px] leading-relaxed">{m.body}</p>
                          <p className={cx('mt-1 flex items-center justify-end gap-1 text-[10px]', out ? 'text-white/55' : 'text-slate-400')}>
                            {m.channel === 'email' ? 'Email' : 'Text'} · {timeOf(m.at)}
                            {out && m.status === 'sending' && <span className="ml-0.5 italic">· sending…</span>}
                            {out && m.status === 'failed' && <span className="ml-0.5 font-medium text-rose-300">· failed</span>}
                            {out && m.real && <span className="ml-0.5">· sent ✓</span>}
                          </p>
                        </div>
                      </div>
                    </div>
                  )
                })}
                {typing && (
                  <div className="flex justify-start pt-1">
                    <TypingBubble />
                  </div>
                )}
              </div>

              {/* composer */}
              <div className="border-t border-slate-100 px-4 py-3 dark:border-white/10">
                <div className="mb-2 flex items-center gap-2">
                  <div className="inline-flex rounded-lg border border-slate-200 p-0.5 dark:border-white/10">
                    {[['sms', 'Text', MessageSquare], ['email', 'Email', Mail]].map(([key, label, Icon]) => (
                      <button
                        key={key}
                        onClick={() => setChannel(key)}
                        className={cx(
                          'inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium transition-colors',
                          channel === key ? 'bg-navy-900 text-white dark:bg-white/15' : 'text-slate-500 hover:text-navy-900 dark:hover:text-white',
                        )}
                      >
                        <Icon className="h-3 w-3" /> {label}
                      </button>
                    ))}
                  </div>
                  <span className="flex items-center gap-1 text-[11px] text-slate-400">
                    {realEmail ? (
                      <><span className="h-1.5 w-1.5 rounded-full bg-sage-500" /> sends for real from {mailLabel}</>
                    ) : channel === 'email' ? (
                      <button onClick={() => go('settings')} className="inline-flex items-center gap-1 hover:text-navy-700 dark:hover:text-white">
                        <Plug className="h-3 w-3" /> in-app only — connect your email to send for real
                      </button>
                    ) : prov ? (
                      <><span className="h-1.5 w-1.5 rounded-full bg-sage-500" /> via {prov.name}</>
                    ) : (
                      <><Plug className="h-3 w-3" /> in-app only — connect in Integrations to send for real</>
                    )}
                  </span>
                </div>
                <div className="flex items-end gap-2">
                  <textarea
                    rows={1}
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        send()
                      }
                    }}
                    placeholder={`Message ${active.b.name.split(' ')[0]}…`}
                    className="max-h-32 min-h-[2.5rem] flex-1 resize-none rounded-xl border border-slate-300/70 bg-white px-3 py-2 text-[13px] text-slate-700 transition-colors placeholder:text-slate-400 hover:border-slate-400/80 focus:border-navy-500 focus:outline-none focus:ring-2 focus:ring-navy-500/15 dark:border-white/10 dark:bg-navy-950 dark:text-slate-100"
                  />
                  <button
                    onClick={send}
                    disabled={!draft.trim()}
                    aria-label="Send"
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-navy-900 text-white transition-all duration-150 hover:bg-navy-800 active:scale-90 disabled:opacity-40 dark:bg-white/15 dark:hover:bg-white/25"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
