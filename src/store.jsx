import { createContext, useContext, useMemo, useState, useCallback, useRef, useEffect } from 'react'
import {
  SEED_BORROWERS,
  SEED_TASKS,
  SEED_AGENT_INTROS,
  SEED_MESSAGES,
  SEED_TEMPLATES,
  SEED_PORTAL_CHAT,
  SEED_VAULT,
  DEFAULT_SHARE_PERMS,
  LOAN_TYPES,
  STATUSES,
  NEXT_ACTION_LABEL,
  TASK_STATUSES,
  officerById,
  agentById,
  docsFor,
  d,
  daysUntil,
  isOverdue,
  isStuck,
  isClosedOut,
} from './data.js'
import { backendProvider, fetchInbox, integrationBackendStatus, runIntegrationAction, sendViaBackend } from './api.js'

const Ctx = createContext(null)
export const useApp = () => useContext(Ctx)

/* ---------- persistence: your data survives reloads ----------
   Bump PERSIST_VERSION whenever the seed data shape changes so
   returning users get the fresh demo instead of a stale cache. */
const PERSIST_KEY = 'msl-state'
const PERSIST_VERSION = 'v1'
const loadSaved = () => {
  try {
    const raw = JSON.parse(localStorage.getItem(PERSIST_KEY))
    return raw && raw.v === PERSIST_VERSION ? raw.data : null
  } catch {
    return null
  }
}
const SAVED = loadSaved()

/* Sequence ids (msgNNN, bNNN, tNNN, nNNN) are minted from a counter that
   resets each load — but state persists in localStorage, so the counter must
   start ABOVE any saved id or new ids collide with old ones (duplicate React
   keys → duplicated/dropped messages). Scan saved data for the highest suffix. */
const maxSavedSeq = (saved) => {
  let max = 100
  if (!saved) return max
  const scan = (id) => {
    const n = parseInt(String(id).replace(/^\D+/, ''), 10)
    if (Number.isFinite(n) && n > max) max = n
  }
  Object.values(saved.messages ?? {}).forEach((thread) => (thread ?? []).forEach((m) => scan(m.id)))
  ;(saved.borrowers ?? []).forEach((b) => {
    scan(b.id)
    ;(b.notes ?? []).forEach((note) => scan(note.id))
  })
  ;(saved.tasks ?? []).forEach((t) => scan(t.id))
  return max
}

const DEFAULT_CRM = {
  q: '',
  status: 'All',
  officer: 'All',
  loanType: 'All',
  overdue: false,
  missing: false,
  stuck: false,
  apply: false,
}

export function AppProvider({ children }) {
  const [view, setView] = useState(() => {
    try {
      return new URLSearchParams(window.location.search).has('integration') ? { page: 'integrations' } : { page: 'dashboard' }
    } catch {
      return { page: 'dashboard' }
    }
  })
  const [borrowers, setBorrowers] = useState(SAVED?.borrowers ?? SEED_BORROWERS)
  const [tasks, setTasks] = useState(SAVED?.tasks ?? SEED_TASKS)
  const [messages, setMessages] = useState(SAVED?.messages ?? SEED_MESSAGES)
  const [apHandled, setApHandled] = useState(SAVED?.apHandled ?? {}) // autopilot suggestions acted on / snoozed
  const [toasts, setToasts] = useState([])
  const [crm, setCrmState] = useState(DEFAULT_CRM)
  const [seat, setSeatState] = useState('julene') // 'team' or an officer id; defaults to the signed-in officer
  const [notifPrefs, setNotifPrefs] = useState(
    SAVED?.notifPrefs ?? {
      overdue: true,
      tasks: true,
      applyLeads: true,
      rateLocks: true,
      digest: true,
      weekly: false,
    },
  )
  const [signedIn, setSignedIn] = useState(false)
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem('msl-dark') === '1' ? 'dark' : 'light'
    } catch {
      return 'light'
    }
  })
  const [celebrate, setCelebrate] = useState(0)
  const [palette, setPaletteState] = useState(() => {
    try {
      return localStorage.getItem('msl-palette') ?? 'classic'
    } catch {
      return 'classic'
    }
  })
  // real two-way mail backend: 'outlook' | 'gmail' | null (null = demo / not connected).
  // Probed once from /api/health — absent on the static demo, so it stays null there.
  const [mailBackend, setMailBackend] = useState(null)
  const [connections, setConnections] = useState({})
  /* job-board lane per borrower (defaults derived from status until dragged),
     editable email templates, portal sharing, group chat, and the post-close vault */
  const [boards, setBoards] = useState(SAVED?.boards ?? {})
  const [templates, setTemplates] = useState(SAVED?.templates ?? SEED_TEMPLATES)
  const [shares, setShares] = useState(SAVED?.shares ?? {})
  const [portalChat, setPortalChat] = useState(SAVED?.portalChat ?? SEED_PORTAL_CHAT)
  const [vault, setVault] = useState(SAVED?.vault ?? SEED_VAULT)
  const idSeq = useRef(maxSavedSeq(SAVED))

  const setNotifPref = useCallback((key, val) => setNotifPrefs((p) => ({ ...p, [key]: val })), [])

  /* ---------- auth (demo sign-in) & theme ---------- */
  const signIn = useCallback((officerId) => {
    if (officerId) setSeatState(officerId)
    setSignedIn(true)
  }, [])
  const signOut = useCallback(() => setSignedIn(false), [])
  const toggleTheme = useCallback(
    () =>
      setTheme((t) => {
        const next = t === 'light' ? 'dark' : 'light'
        try {
          localStorage.setItem('msl-dark', next === 'dark' ? '1' : '0')
        } catch {
          /* storage unavailable; theme still toggles for this session */
        }
        return next
      }),
    [],
  )

  const setPalette = useCallback((id) => {
    setPaletteState(id)
    try {
      localStorage.setItem('msl-palette', id)
    } catch {
      /* storage may be unavailable (private mode); theme still applies */
    }
  }, [])

  useEffect(() => {
    const root = document.documentElement
    if (theme === 'dark') root.classList.add('dark')
    else root.classList.remove('dark')
  }, [theme])

  useEffect(() => {
    const root = document.documentElement
    if (palette === 'classic') delete root.dataset.theme
    else root.dataset.theme = palette
  }, [palette])

  const refreshMailBackend = useCallback(async (refresh = true) => {
    const provider = await backendProvider(refresh)
    setMailBackend(provider)
    return provider
  }, [])

  const refreshConnections = useCallback(async (refresh = true) => {
    const status = await integrationBackendStatus({ refresh })
    const active = Object.fromEntries(
      Object.values(status.connectors || {})
        .filter((item) => item.connected)
        .map((item) => [item.id, { account: item.name, since: d(0), authType: item.authType }]),
    )
    setConnections(active)
    return active
  }, [])

  // Detect a connected OAuth mailbox once on load. Static builds have no API,
  // so they stay in clearly labeled demo mode.
  useEffect(() => {
    let alive = true
    backendProvider(true)
      .then((p) => alive && setMailBackend(p))
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    refreshConnections(true).catch(() => {})
  }, [refreshConnections])

  const currentOfficer = seat === 'team' ? null : officerById(seat)

  const setSeat = useCallback((id) => {
    setSeatState(id)
    window.scrollTo({ top: 0 })
  }, [])

  const resetDemo = useCallback(() => {
    try {
      localStorage.removeItem(PERSIST_KEY)
    } catch {
      /* ignore */
    }
    window.location.reload()
  }, [])

  /* ---------- toasts ---------- */
  const toast = useCallback((text, emoji = '✓') => {
    const id = ++idSeq.current
    setToasts((t) => [...t, { id, text, emoji }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3600)
  }, [])

  /* ---------- navigation ---------- */
  const go = useCallback((page, extra = {}) => {
    setView({ page, ...extra })
    window.scrollTo({ top: 0 })
  }, [])

  const openLoan = useCallback((id, tab = 'Overview') => go('loan', { id, tab }), [go])

  /* navigate to CRM with preset filters */
  const goBorrowers = useCallback(
    (preset = {}) => {
      setCrmState({ ...DEFAULT_CRM, ...preset })
      go('borrowers')
    },
    [go],
  )

  const setCrm = useCallback((patch) => setCrmState((c) => ({ ...c, ...patch })), [])

  /* ---------- Partner Link: connection to the separate AgentHQ app ----------
     The whole pitch: you don't NEED both programs to work together —
     but link them and everything flows by itself. Holly is linked
     (the flawless path); Bree & Carl still work by phone and email. */
  const [agentLinks, setAgentLinks] = useState(
    SAVED?.agentLinks ?? {
      holly: { status: 'connected', since: d(-30) },
      bree: { status: 'none' },
      carl: { status: 'none' },
    },
  )

  const connectAgent = useCallback(
    (agentId) => {
      const agent = agentById(agentId)
      setAgentLinks((m) => ({ ...m, [agentId]: { status: 'invited' } }))
      toast(`Link invite sent to ${agent?.name ?? 'agent'}`, '📨')
      setTimeout(() => {
        setAgentLinks((m) => ({ ...m, [agentId]: { status: 'connected', since: d(0) } }))
        toast(`${agent?.name?.split(' ')[0] ?? 'They'} accepted — you're linked 🎉`, '🔗')
      }, 1800)
    },
    [toast],
  )

  /* ---------- borrower mutations ---------- */
  const patchBorrower = useCallback((id, fn) => {
    setBorrowers((list) => list.map((b) => (b.id === id ? fn(b) : b)))
  }, [])

  const logEvent = (b, type, text) => ({
    ...b,
    timeline: [...b.timeline, { date: d(0), type, text }],
  })

  const advanceStatus = useCallback(
    (id) => {
      setBorrowers((list) =>
        list.map((b) => {
          if (b.id !== id) return b
          const i = STATUSES.indexOf(b.status)
          const next = STATUSES[i + 1]
          if (!next || isClosedOut(b)) return b

          let nb = {
            ...b,
            status: next,
            stageEnteredAt: d(0),
            lastContact: d(0),
            nextFollowUp: next === 'Closed' ? null : d(3),
          }
          // "Request documents" action also fires the doc request
          if (next === 'Documents Needed') {
            nb.docs = nb.docs.map((x) => (x.status === 'Needed' ? { ...x, status: 'Requested' } : x))
            nb = logEvent(nb, 'doc', 'Document request sent to borrower')
          }
          nb = logEvent(nb, 'status', next === 'Closed' ? 'Loan closed 🎉' : `Status moved: ${b.status} → ${next}`)
          // linked partners never have to ask "any update?" — AgentHQ gets it automatically
          const agent = agentById(nb.agentId)
          if (agent && agentLinks[agent.id]?.status === 'connected')
            nb = logEvent(nb, 'sms', `Auto-update sent to ${agent.name} via AgentHQ link: ${next}`)
          toast(
            next === 'Closed'
              ? `${b.name} — loan closed! 🎉`
              : `${b.name} → ${next}`,
            next === 'Closed' ? '🎉' : '⚡',
          )
          if (next === 'Closed') setCelebrate((c) => c + 1)
          return nb
        }),
      )
    },
    [toast, agentLinks],
  )

  const setDocStatus = useCallback(
    (bid, docName, status) => {
      patchBorrower(bid, (b) =>
        logEvent(
          {
            ...b,
            docs: b.docs.map((x) => (x.name === docName ? { ...x, status } : x)),
          },
          'doc',
          `${docName} marked ${status}`,
        ),
      )
    },
    [patchBorrower],
  )

  const requestDocs = useCallback(
    (bid) => {
      patchBorrower(bid, (b) => {
        const n = b.docs.filter((x) => x.status === 'Needed' || x.status === 'Rejected').length
        if (!n) return b
        return logEvent(
          {
            ...b,
            docs: b.docs.map((x) =>
              x.status === 'Needed' || x.status === 'Rejected' ? { ...x, status: 'Requested' } : x,
            ),
          },
          'doc',
          `Document request sent (${n} item${n > 1 ? 's' : ''})`,
        )
      })
      toast('Document request sent to borrower', '📨')
    },
    [patchBorrower, toast],
  )

  const addNote = useCallback(
    (bid, text, author = 'MS Lending Team') => {
      patchBorrower(bid, (b) =>
        logEvent(
          {
            ...b,
            notes: [{ id: 'n' + ++idSeq.current, author, date: d(0), text }, ...b.notes],
          },
          'note',
          `Note added — “${text.length > 48 ? text.slice(0, 48) + '…' : text}”`,
        ),
      )
      toast('Note saved', '📝')
    },
    [patchBorrower, toast],
  )

  const setFollowUp = useCallback(
    (bid, iso) => {
      patchBorrower(bid, (b) => ({ ...b, nextFollowUp: iso }))
      toast('Follow-up scheduled', '📅')
    },
    [patchBorrower, toast],
  )

  const addBorrower = useCallback(
    (form, { navigate = true } = {}) => {
      const id = 'b' + ++idSeq.current
      const nb = {
        coBorrower: null,
        state: 'MS',
        term: 30,
        rate: 6.5,
        creditScore: null,
        propertyValue: null,
        propertyAddress: `${form.city}, MS`,
        employer: '—',
        estClosing: null,
        lastContact: null,
        purpose: form.purpose ?? 'Purchase',
        ...form,
        id,
        amount: Number(form.amount) || 0,
        status: 'New Lead',
        createdAt: d(0),
        stageEnteredAt: d(0),
        nextFollowUp: d(1),
        docs: docsFor(form.purpose ?? 'Purchase'),
        notes: [],
        timeline: [
          {
            date: d(0),
            type: form.viaApply ? 'apply' : 'created',
            text: form.viaReferral
              ? `Referred by ${form.referredBy}`
              : form.viaApply
                ? `Captured via apply link — ${form.source}`
                : `Lead created from ${form.source}`,
          },
        ],
      }
      setBorrowers((list) => [nb, ...list])
      toast(
        form.viaReferral
          ? `Referral in — ${form.name} from ${form.referredBy?.split(' (')[0]}`
          : `${form.name} added as a new lead`,
        form.viaReferral ? '🤝' : '✓',
      )
      if (navigate) openLoan(id)
      return id
    },
    [openLoan, toast],
  )

  /* ---------- bulk import (CSV migration from another system) ----------
     One toast, no per-row navigation. Rows already mapped to fields. */
  const importBorrowers = useCallback(
    (rows, { officerId } = {}) => {
      const valid = (rows || []).filter((r) => (r.name || '').trim())
      if (!valid.length) return 0
      const owner = officerById(officerId)?.id || (seat === 'team' ? 'michelle' : seat)
      const created = valid.map((form) => {
        const id = 'b' + ++idSeq.current
        const purpose = ['Purchase', 'Refinance', 'Cash-Out Refinance'].includes(form.purpose) ? form.purpose : 'Purchase'
        const status = STATUSES.includes(form.status) ? form.status : 'New Lead'
        const closed = status === 'Closed' || status === 'Lost'
        return {
          coBorrower: null, state: 'MS', term: 30, rate: 6.5, creditScore: null,
          propertyValue: null, propertyAddress: `${(form.city || 'Madison').trim()}, MS`,
          employer: '—', estClosing: null, lastContact: null, agentId: null,
          id,
          name: form.name.trim(),
          phone: (form.phone || '').trim(),
          email: (form.email || '').trim(),
          loanType: LOAN_TYPES.includes(form.loanType) ? form.loanType : 'Conventional',
          purpose,
          amount: Number(String(form.amount ?? '').replace(/[^0-9.]/g, '')) || 0,
          city: (form.city || 'Madison').trim(),
          source: (form.source || '').trim() || 'Imported',
          officerId: owner,
          status,
          createdAt: d(0), stageEnteredAt: d(0),
          nextFollowUp: closed ? null : d(1),
          docs: docsFor(purpose), notes: [],
          timeline: [{ date: d(0), type: 'created', text: 'Imported from CSV' }],
        }
      })
      setBorrowers((list) => [...created, ...list])
      toast(`Imported ${created.length} client${created.length > 1 ? 's' : ''} 🎉`, '📥')
      return created.length
    },
    [seat, toast],
  )

  /* ---------- job board: drag a file into a lane ---------- */
  const setBorrowerBoard = useCallback((id, col) => {
    setBoards((m) => (m[id] === col ? m : { ...m, [id]: col }))
  }, [])

  /* ---------- custom-named documents (some files need odd paperwork) ---------- */
  const addDoc = useCallback(
    (bid, name) => {
      const clean = (name ?? '').trim()
      if (!clean) return
      patchBorrower(bid, (b) =>
        b.docs.some((x) => x.name.toLowerCase() === clean.toLowerCase())
          ? b
          : logEvent({ ...b, docs: [...b.docs, { name: clean, status: 'Needed' }] }, 'doc', `Added “${clean}” to the document checklist`),
      )
      toast('Document added to the checklist', '📄')
    },
    [patchBorrower, toast],
  )

  /* ---------- email templates ---------- */
  const addTemplate = useCallback(
    (t) => {
      const id = 'tpl-' + ++idSeq.current
      setTemplates((list) => [{ id, name: t.name?.trim() || 'Untitled template', subject: t.subject ?? '', body: t.body ?? '' }, ...list])
      toast('Template saved', '📝')
      return id
    },
    [toast],
  )
  const updateTemplate = useCallback(
    (id, patch) => {
      setTemplates((list) => list.map((t) => (t.id === id ? { ...t, ...patch } : t)))
      toast('Template updated', '✓')
    },
    [toast],
  )
  const deleteTemplate = useCallback(
    (id) => {
      setTemplates((list) => list.filter((t) => t.id !== id))
      toast('Template removed', '🗑️')
    },
    [toast],
  )

  /* ---------- portal sharing: invite anyone, they pick who sees what ---------- */
  const addShare = useCallback(
    (bid, { email, name, relation }) => {
      const id = 'sh-' + ++idSeq.current
      const who = (name ?? '').trim() || (email ?? '').trim()
      setShares((m) => ({
        ...m,
        [bid]: [...(m[bid] ?? []), { id, email: (email ?? '').trim(), name: who, relation: relation ?? 'Other', perms: { ...DEFAULT_SHARE_PERMS } }],
      }))
      toast(`Invitation emailed to ${who}`, '📨')
      return id
    },
    [toast],
  )
  const updateSharePerms = useCallback((bid, shareId, perms) => {
    setShares((m) => ({ ...m, [bid]: (m[bid] ?? []).map((s) => (s.id === shareId ? { ...s, perms } : s)) }))
  }, [])
  const removeShare = useCallback(
    (bid, shareId) => {
      setShares((m) => ({ ...m, [bid]: (m[bid] ?? []).filter((s) => s.id !== shareId) }))
      toast('Access removed', '✓')
    },
    [toast],
  )

  /* ---------- portal group chat: everyone invited can post & read ---------- */
  const postPortalMessage = useCallback((bid, { author, role, text }) => {
    const clean = (text ?? '').trim()
    if (!clean) return
    setPortalChat((m) => ({ ...m, [bid]: [...(m[bid] ?? []), { id: 'pc-' + ++idSeq.current, author, role, text: clean, at: new Date().toISOString() }] }))
  }, [])

  /* ---------- post-close vault: a place to keep the will, insurance, deed… ---------- */
  const addVaultDoc = useCallback(
    (bid, name, addedBy = 'Borrower') => {
      const clean = (name ?? '').trim()
      if (!clean) return
      setVault((m) => ({ ...m, [bid]: [...(m[bid] ?? []), { id: 'vt-' + ++idSeq.current, name: clean, status: 'Stored', addedBy }] }))
      toast(`Saved to the vault — ${clean}`, '🔒')
    },
    [toast],
  )
  const removeVaultDoc = useCallback((bid, id) => {
    setVault((m) => ({ ...m, [bid]: (m[bid] ?? []).filter((v) => v.id !== id) }))
  }, [])

  /* ---------- tasks ---------- */
  const moveTask = useCallback((id, dir) => {
    setTasks((list) =>
      list.map((t) => {
        if (t.id !== id) return t
        const i = TASK_STATUSES.indexOf(t.status)
        const next = TASK_STATUSES[Math.min(Math.max(i + dir, 0), TASK_STATUSES.length - 1)]
        return { ...t, status: next }
      }),
    )
  }, [])

  const completeTask = useCallback(
    (id) => {
      setTasks((list) => list.map((t) => (t.id === id ? { ...t, status: 'Complete' } : t)))
      toast('Task completed', '✅')
    },
    [toast],
  )

  /* drop a task directly into a column (drag & drop) */
  const setTaskStatus = useCallback((id, status) => {
    setTasks((list) => list.map((t) => (t.id === id ? { ...t, status } : t)))
  }, [])

  /* move a task's due date (calendar reschedule) */
  const retargetTask = useCallback(
    (id, due) => {
      setTasks((list) => list.map((t) => (t.id === id ? { ...t, due } : t)))
      toast('Task rescheduled', '📅')
    },
    [toast],
  )

  const addTask = useCallback(
    (form) => {
      setTasks((list) => [{ id: 't' + ++idSeq.current, status: 'To Do', ...form }, ...list])
      toast('Task added', '➕')
    },
    [toast],
  )

  /* ---------- borrower communication ---------- */
  const logCommunication = useCallback(
    (bid, channel, text, toastMsg) => {
      patchBorrower(bid, (b) => logEvent({ ...b, lastContact: d(0) }, channel, text))
      if (toastMsg) toast(toastMsg, '📤')
    },
    [patchBorrower, toast],
  )

  /* ---------- two-way messaging (the Inbox) ---------- */
  const CANNED_REPLIES = [
    'Got it, thank you!',
    'Sounds good 👍',
    'Perfect — appreciate the update!',
    'Okay, I’ll take care of that today.',
    'Thanks for keeping me posted!',
    'Great, talk soon!',
  ]

  const sendMessage = useCallback(
    (bid, channel, body, opts = {}) => {
      const text = (body ?? '').trim()
      if (!text) return
      const mid = 'msg' + ++idSeq.current
      const useBackend = channel === 'email' && !!mailBackend // real Outlook/Gmail send
      const messagingProvider = channel === 'sms' ? (connections.sms ? 'sms' : connections.whatsapp ? 'whatsapp' : null) : null
      const sendingLive = useBackend || !!messagingProvider

      // optimistic: the message appears instantly
      setMessages((m) => ({
        ...m,
        [bid]: [...(m[bid] ?? []), { id: mid, dir: 'out', channel, body: text, at: new Date().toISOString(), read: true, status: sendingLive ? 'sending' : 'sent', real: false }],
      }))
      const preview = text.length > 44 ? text.slice(0, 44) + '…' : text
      patchBorrower(bid, (b) => logEvent({ ...b, lastContact: d(0) }, channel, `${channel === 'email' ? 'Email' : 'Text'} sent — “${preview}”`))

      const b = borrowers.find((x) => x.id === bid)
      if (useBackend) {
        // send through the real connected mailbox (Outlook / Gmail backend)
        ;(async () => {
          try {
            await sendViaBackend({
              to: b?.email,
              subject: opts.subject || 'Update on your loan with MS Lending',
              body: text,
            })
            setMessages((m) => ({ ...m, [bid]: (m[bid] ?? []).map((x) => (x.id === mid ? { ...x, status: 'sent', real: true } : x)) }))
            toast(`Email sent to ${b?.name?.split(' ')[0] ?? 'borrower'} ✓`, '📧')
          } catch {
            setMessages((m) => ({ ...m, [bid]: (m[bid] ?? []).map((x) => (x.id === mid ? { ...x, status: 'failed' } : x)) }))
            toast('Email didn’t send — check your mailbox connection', '⚠️')
          }
        })()
      } else if (messagingProvider) {
        ;(async () => {
          try {
            await runIntegrationAction(messagingProvider, messagingProvider === 'whatsapp' ? 'send_whatsapp' : 'send_sms', { to: b?.phone, body: text })
            setMessages((m) => ({ ...m, [bid]: (m[bid] ?? []).map((x) => (x.id === mid ? { ...x, status: 'sent', real: true } : x)) }))
            toast(`${messagingProvider === 'whatsapp' ? 'WhatsApp' : 'Text'} sent to ${b?.name?.split(' ')[0] ?? 'borrower'} ✓`, '📱')
          } catch {
            setMessages((m) => ({ ...m, [bid]: (m[bid] ?? []).map((x) => (x.id === mid ? { ...x, status: 'failed' } : x)) }))
            toast('Message didn’t send — check the integration connection', '⚠️')
          }
        })()
      } else if (opts.demoReply !== false) {
        // demo realism (in-app only): the borrower replies a moment later
        setTimeout(() => {
          setMessages((m) => {
            const thread = m[bid] ?? []
            const reply = CANNED_REPLIES[thread.length % CANNED_REPLIES.length]
            return { ...m, [bid]: [...thread, { id: 'msg' + ++idSeq.current, dir: 'in', channel, body: reply, at: new Date().toISOString(), read: false }] }
          })
        }, 2400)
      }
    },
    [patchBorrower, toast, borrowers, mailBackend, connections],
  )

  const placeCall = useCallback(async (bid, note = '') => {
    const borrower = borrowers.find((item) => item.id === bid)
    if (!connections.dialer) {
      logCommunication(bid, 'call', `Call logged${note.trim() ? ' — ' + note.trim() : ''}`, 'Call logged')
      return { live: false }
    }
    await runIntegrationAction('dialer', 'place_call', { to: borrower?.phone })
    logCommunication(bid, 'call', `Outbound call placed${note.trim() ? ' — ' + note.trim() : ''}`, 'Call started')
    return { live: true }
  }, [borrowers, connections, logCommunication])

  /* autopilot: suppress a suggestion for N days after acting/snoozing */
  const markAutopilotDone = useCallback((key, days = 3) => {
    setApHandled((m) => ({ ...m, [key]: d(days) }))
  }, [])

  const markRead = useCallback((bid) => {
    setMessages((m) => {
      const thread = m[bid]
      if (!thread || !thread.some((x) => x.dir === 'in' && !x.read)) return m
      return { ...m, [bid]: thread.map((x) => (x.dir === 'in' ? { ...x, read: true } : x)) }
    })
  }, [])

  /* ---------- reciprocity: buyer intros sent TO agents ---------- */
  const [agentIntros, setAgentIntros] = useState(SAVED?.agentIntros ?? SEED_AGENT_INTROS)

  const logIntro = useCallback(
    (agentId, name, note = '') => {
      setAgentIntros((m) => ({
        ...m,
        [agentId]: [{ name, date: d(0), note }, ...(m[agentId] ?? [])],
      }))
      toast(`Intro logged — they'll see it on their ledger`, '🤝')
    },
    [toast],
  )

  /* ---------- dashboard metrics (scoped to the active seat) ---------- */
  const metrics = useMemo(() => {
    const mine = seat === 'team' ? borrowers : borrowers.filter((b) => b.officerId === seat)
    const myTasks = seat === 'team' ? tasks : tasks.filter((t) => t.officerId === seat)
    const active = mine.filter((b) => !isClosedOut(b))
    const newThisWeek = mine.filter((b) => daysUntil(b.createdAt) >= -6)
    const waitingDocs = active.filter((b) => b.status === 'Documents Needed')
    const underwriting = active.filter((b) => b.status === 'Underwriting')
    const readyToClose = active.filter((b) => b.status === 'Clear to Close')
    const overdue = active.filter(isOverdue)
    const stuck = active.filter(isStuck)
    const todays = myTasks.filter((t) => t.status !== 'Complete' && daysUntil(t.due) <= 0)
    const activity = mine
      .flatMap((b) => b.timeline.map((e) => ({ ...e, borrower: b.name, borrowerId: b.id })))
      .sort((a, z) => (a.date < z.date ? 1 : -1))
      .slice(0, 8)
    return { active, newThisWeek, waitingDocs, underwriting, readyToClose, overdue, stuck, todays, activity }
  }, [borrowers, tasks, seat])

  /* ---------- persist everything that's "the user's data" ---------- */
  useEffect(() => {
    try {
      localStorage.setItem(
        PERSIST_KEY,
        JSON.stringify({
          v: PERSIST_VERSION,
          data: { borrowers, tasks, messages, agentIntros, agentLinks, notifPrefs, apHandled, boards, templates, shares, portalChat, vault },
        }),
      )
    } catch {
      /* storage unavailable (private mode) — stays in memory this session */
    }
  }, [borrowers, tasks, messages, agentIntros, agentLinks, notifPrefs, apHandled, boards, templates, shares, portalChat, vault])

  const value = {
    view,
    go,
    openLoan,
    goBorrowers,
    crm,
    setCrm,
    borrowers,
    tasks,
    toasts,
    toast,
    metrics,
    advanceStatus,
    setDocStatus,
    requestDocs,
    addNote,
    setFollowUp,
    addBorrower,
    moveTask,
    completeTask,
    addTask,
    setTaskStatus,
    retargetTask,
    celebrate,
    logCommunication,
    messages,
    sendMessage,
    placeCall,
    markRead,
    apHandled,
    markAutopilotDone,
    resetDemo,
    mailBackend,
    refreshMailBackend,
    refreshConnections,
    agentIntros,
    logIntro,
    agentLinks,
    connectAgent,
    connections,
    seat,
    setSeat,
    currentOfficer,
    notifPrefs,
    setNotifPref,
    signedIn,
    signIn,
    signOut,
    theme,
    toggleTheme,
    palette,
    setPalette,
    boards,
    setBorrowerBoard,
    importBorrowers,
    addDoc,
    templates,
    addTemplate,
    updateTemplate,
    deleteTemplate,
    shares,
    addShare,
    updateSharePerms,
    removeShare,
    portalChat,
    postPortalMessage,
    vault,
    addVaultDoc,
    removeVaultDoc,
    nextActionLabel: (b) => NEXT_ACTION_LABEL[b.status],
  }

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
