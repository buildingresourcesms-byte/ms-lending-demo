import { createContext, useContext, useMemo, useState, useCallback, useRef, useEffect } from 'react'
import {
  SEED_BORROWERS,
  SEED_TASKS,
  SEED_CONNECTIONS,
  SEED_AGENT_INTROS,
  SEED_MESSAGES,
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
  const [view, setView] = useState({ page: 'dashboard' })
  const [borrowers, setBorrowers] = useState(SAVED?.borrowers ?? SEED_BORROWERS)
  const [tasks, setTasks] = useState(SAVED?.tasks ?? SEED_TASKS)
  const [messages, setMessages] = useState(SAVED?.messages ?? SEED_MESSAGES)
  const [toasts, setToasts] = useState([])
  const [crm, setCrmState] = useState(DEFAULT_CRM)
  const [connections, setConnections] = useState(SAVED?.connections ?? SEED_CONNECTIONS)
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
  const idSeq = useRef(100)

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
    (bid, channel, body) => {
      const text = (body ?? '').trim()
      if (!text) return
      setMessages((m) => ({
        ...m,
        [bid]: [...(m[bid] ?? []), { id: 'msg' + ++idSeq.current, dir: 'out', channel, body: text, at: new Date().toISOString(), read: true }],
      }))
      const preview = text.length > 44 ? text.slice(0, 44) + '…' : text
      patchBorrower(bid, (b) => logEvent({ ...b, lastContact: d(0) }, channel, `${channel === 'email' ? 'Email' : 'Text'} sent — “${preview}”`))
      // demo realism: the borrower replies a moment later so the thread feels live
      setTimeout(() => {
        setMessages((m) => {
          const thread = m[bid] ?? []
          const reply = CANNED_REPLIES[thread.length % CANNED_REPLIES.length]
          return { ...m, [bid]: [...thread, { id: 'msg' + ++idSeq.current, dir: 'in', channel, body: reply, at: new Date().toISOString(), read: false }] }
        })
      }, 2400)
    },
    [patchBorrower],
  )

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

  /* ---------- integrations ---------- */
  const connectIntegration = useCallback(
    (id, account, name) => {
      setConnections((c) => ({ ...c, [id]: { account, since: d(0) } }))
      toast(`${name ?? 'Integration'} connected`, '🔗')
    },
    [toast],
  )

  const disconnectIntegration = useCallback(
    (id, name) => {
      setConnections((c) => {
        const next = { ...c }
        delete next[id]
        return next
      })
      toast(`${name ?? 'Integration'} disconnected`, '✓')
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
        JSON.stringify({ v: PERSIST_VERSION, data: { borrowers, tasks, messages, connections, agentIntros, agentLinks, notifPrefs } }),
      )
    } catch {
      /* storage unavailable (private mode) — stays in memory this session */
    }
  }, [borrowers, tasks, messages, connections, agentIntros, agentLinks, notifPrefs])

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
    markRead,
    resetDemo,
    agentIntros,
    logIntro,
    agentLinks,
    connectAgent,
    connections,
    connectIntegration,
    disconnectIntegration,
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
    nextActionLabel: (b) => NEXT_ACTION_LABEL[b.status],
  }

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
