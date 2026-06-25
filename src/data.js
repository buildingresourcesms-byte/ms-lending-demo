/* ============================================================
   MS Lending — Loan Workspace demo
   All borrower data below is FICTIONAL sample data.
   ============================================================ */

/* ---------- date helpers (all dates relative to "today" so the
   demo always looks fresh) ---------- */
export const d = (n) => {
  const t = new Date()
  t.setDate(t.getDate() + n)
  return t.toISOString().slice(0, 10)
}

export const fmtDate = (iso) =>
  iso
    ? new Date(iso + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : '—'

export const fmtDateFull = (iso) =>
  iso
    ? new Date(iso + 'T12:00:00').toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      })
    : '—'

export const daysUntil = (iso) => {
  if (!iso) return null
  const now = new Date()
  now.setHours(12, 0, 0, 0)
  return Math.round((new Date(iso + 'T12:00:00') - now) / 86400000)
}

export const relDate = (iso) => {
  if (!iso) return '—'
  const n = daysUntil(iso)
  if (n === 0) return 'Today'
  if (n === 1) return 'Tomorrow'
  if (n === -1) return 'Yesterday'
  return n > 0 ? `in ${n}d` : `${-n}d ago`
}

export const money = (n) =>
  '$' + Math.round(n).toLocaleString('en-US')

export const monthlyPayment = (amount, rate, years = 30) => {
  const r = rate / 100 / 12
  const n = years * 12
  return (amount * r) / (1 - Math.pow(1 + r, -n))
}

/* ---------- pipeline statuses ---------- */
export const STATUSES = [
  'New Lead',
  'Contacted',
  'Application Started',
  'Documents Needed',
  'In Review',
  'Pre-Approved',
  'Underwriting',
  'Clear to Close',
  'Closed',
  'Lost',
]

export const ACTIVE_STATUSES = STATUSES.filter((s) => s !== 'Closed' && s !== 'Lost')

export const STATUS_STYLES = {
  'New Lead':            { badge: 'bg-sky-50 text-sky-700 ring-sky-600/20',          dot: 'bg-sky-500',    bar: '#38bdf8' },
  'Contacted':           { badge: 'bg-blue-50 text-blue-700 ring-blue-600/20',       dot: 'bg-blue-500',   bar: '#3b82f6' },
  'Application Started': { badge: 'bg-indigo-50 text-indigo-700 ring-indigo-600/20', dot: 'bg-indigo-500', bar: '#6366f1' },
  'Documents Needed':    { badge: 'bg-amber-50 text-amber-800 ring-amber-600/25',    dot: 'bg-amber-500',  bar: '#f59e0b' },
  'In Review':           { badge: 'bg-cyan-50 text-cyan-700 ring-cyan-600/20',       dot: 'bg-cyan-500',   bar: '#06b6d4' },
  'Pre-Approved':        { badge: 'bg-teal-50 text-teal-700 ring-teal-600/20',       dot: 'bg-teal-500',   bar: '#14b8a6' },
  'Underwriting':        { badge: 'bg-violet-50 text-violet-700 ring-violet-600/20', dot: 'bg-violet-500', bar: '#8b5cf6' },
  'Clear to Close':      { badge: 'bg-sage-50 text-sage-700 ring-sage-600/20',       dot: 'bg-sage-500',   bar: '#478b5b' },
  'Closed':              { badge: 'bg-sage-100 text-sage-800 ring-sage-600/20',      dot: 'bg-sage-600',   bar: '#357047' },
  'Lost':                { badge: 'bg-slate-100 text-slate-500 ring-slate-400/30',   dot: 'bg-slate-400',  bar: '#94a3b8' },
}

/* What moving forward means from each stage (button label) */
export const NEXT_ACTION_LABEL = {
  'New Lead': 'Log first call',
  'Contacted': 'Start application',
  'Application Started': 'Request documents',
  'Documents Needed': 'Move to review',
  'In Review': 'Issue pre-approval',
  'Pre-Approved': 'Submit to underwriting',
  'Underwriting': 'Mark clear to close',
  'Clear to Close': 'Mark closed',
}

/* The "current next step" shown on each file */
export const NEXT_STEP = {
  'New Lead': 'Call to introduce MS Lending & pre-qualify',
  'Contacted': 'Send the online application link',
  'Application Started': 'Send the document request list',
  'Documents Needed': 'Collect the missing documents',
  'In Review': 'Verify income & issue pre-approval letter',
  'Pre-Approved': 'Package the file & submit to underwriting',
  'Underwriting': 'Watch for conditions & respond to the underwriter',
  'Clear to Close': 'Coordinate closing day with the title company',
  'Closed': 'Send a thank-you & ask for a referral',
  'Lost': 'Add to the nurture list for a future check-in',
}

/* ---------- documents ---------- */
export const DOC_STATUSES = ['Needed', 'Requested', 'Uploaded', 'Reviewed', 'Approved', 'Rejected']

export const DOC_STYLES = {
  Needed:    { badge: 'bg-rose-50 text-rose-700 ring-rose-600/20',       dot: 'bg-rose-500' },
  Requested: { badge: 'bg-amber-50 text-amber-800 ring-amber-600/25',    dot: 'bg-amber-500' },
  Uploaded:  { badge: 'bg-blue-50 text-blue-700 ring-blue-600/20',       dot: 'bg-blue-500' },
  Reviewed:  { badge: 'bg-violet-50 text-violet-700 ring-violet-600/20', dot: 'bg-violet-500' },
  Approved:  { badge: 'bg-sage-50 text-sage-700 ring-sage-600/20',       dot: 'bg-sage-500' },
  Rejected:  { badge: 'bg-red-50 text-red-700 ring-red-600/20',          dot: 'bg-red-500' },
}

export const DOC_TYPES = [
  "Driver's License",
  'Pay Stubs',
  'Bank Statements',
  'W-2s',
  'Tax Returns',
  'Purchase Agreement',
  'Credit Authorization',
  'Proof of Insurance',
  'Employment Verification',
]

/* For refinances the 6th doc is a mortgage statement instead of a
   purchase agreement — small touch of realism. */
export const docsFor = (purpose, statuses = []) =>
  DOC_TYPES.map((name, i) => ({
    name: i === 5 && purpose !== 'Purchase' ? 'Current Mortgage Statement' : name,
    status: statuses[i] ?? 'Needed',
  }))

export const docProgress = (b) => {
  const done = b.docs.filter((x) => x.status === 'Approved').length
  return { done, total: b.docs.length, pct: Math.round((done / b.docs.length) * 100) }
}

export const missingDocs = (b) =>
  b.docs.filter((x) => x.status === 'Needed' || x.status === 'Requested' || x.status === 'Rejected')

/* ---------- smart flags ---------- */
export const isClosedOut = (b) => b.status === 'Closed' || b.status === 'Lost'

export const isOverdue = (b) =>
  !isClosedOut(b) && b.nextFollowUp && daysUntil(b.nextFollowUp) < 0

export const daysInStage = (b) => Math.max(0, -daysUntil(b.stageEnteredAt))

export const STUCK_DAYS = 10
export const isStuck = (b) => !isClosedOut(b) && daysInStage(b) > STUCK_DAYS

/* ---------- SLA targets per active stage (days) ---------- */
export const STAGE_SLA = {
  'New Lead': 1,
  'Contacted': 2,
  'Application Started': 3,
  'Documents Needed': 7,
  'In Review': 4,
  'Pre-Approved': 5,
  'Underwriting': 10,
  'Clear to Close': 5,
}

export const slaStatus = (b) => {
  const target = STAGE_SLA[b.status]
  if (!target || isClosedOut(b)) return null
  const days = daysInStage(b)
  return { days, target, over: days > target, pct: Math.min(100, Math.round((days / target) * 100)) }
}

/* ---------- rate lock ---------- */
export const RATE_LOCK_WARN_DAYS = 7
export const rateLockStatus = (b) => {
  if (!b.rateLockExpires || isClosedOut(b)) return null
  const days = daysUntil(b.rateLockExpires)
  return {
    days,
    expired: days < 0,
    soon: days >= 0 && days <= RATE_LOCK_WARN_DAYS,
    label:
      days < 0
        ? `Rate lock expired ${-days}d ago`
        : days === 0
          ? 'Rate lock expires today'
          : `Rate lock: ${days}d left`,
  }
}

/* ---------- calendar events ----------
   One place that turns borrowers + tasks into dated events so the
   calendar, dashboard, and widgets all agree on what's happening. */
export const CAL_TYPES = {
  closing: { label: 'Closing', chip: 'bg-sage-500', soft: 'bg-sage-50 text-sage-700 ring-sage-600/20 dark:bg-sage-500/15' },
  lock: { label: 'Rate lock', chip: 'bg-amber-500', soft: 'bg-amber-50 text-amber-700 ring-amber-600/25 dark:bg-amber-500/15' },
  followup: { label: 'Follow-up', chip: 'bg-sky-500', soft: 'bg-sky-50 text-sky-700 ring-sky-600/20 dark:bg-sky-500/15' },
  task: { label: 'Task due', chip: 'bg-violet-500', soft: 'bg-violet-50 text-violet-700 ring-violet-600/20 dark:bg-violet-500/15' },
  meeting: { label: 'Meeting', chip: 'bg-teal-500', soft: 'bg-teal-50 text-teal-700 ring-teal-600/20 dark:bg-teal-500/15' },
}

export const calendarEvents = (borrowers, tasks, seat = 'team') => {
  const mine = seat === 'team' ? borrowers : borrowers.filter((b) => b.officerId === seat)
  const myTasks = seat === 'team' ? tasks : tasks.filter((t) => t.officerId === seat)
  const events = []
  mine.forEach((b) => {
    if (isClosedOut(b)) return
    if (b.estClosing)
      events.push({ id: 'c' + b.id, date: b.estClosing, type: 'closing', title: b.name, sub: `${money(b.amount)} · ${b.status}`, borrowerId: b.id })
    if (b.rateLockExpires)
      events.push({ id: 'l' + b.id, date: b.rateLockExpires, type: 'lock', title: b.name, sub: `Lock expires · ${b.rate}%`, borrowerId: b.id })
    if (b.nextFollowUp)
      events.push({ id: 'f' + b.id, date: b.nextFollowUp, type: 'followup', title: b.name, sub: `Follow up · ${b.status}`, borrowerId: b.id })
  })
  myTasks.forEach((t) => {
    if (t.status === 'Complete') return
    const b = borrowers.find((x) => x.id === t.borrowerId)
    events.push({ id: 't' + t.id, date: t.due, type: 'task', title: t.title, sub: b ? b.name : 'Team task', borrowerId: t.borrowerId, isTask: true })
  })
  return events.sort((a, z) => (a.date < z.date ? -1 : a.date > z.date ? 1 : 0))
}

/* date helpers for the month grid (noon-anchored to dodge TZ edges) */
export const addDaysISO = (iso, n) => {
  const t = new Date(iso + 'T12:00:00')
  t.setDate(t.getDate() + n)
  return t.toISOString().slice(0, 10)
}
export const weekdayOf = (iso) => new Date(iso + 'T12:00:00').getDay()
export const monthLabel = (iso) =>
  new Date(iso + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

/* ---------- borrower-portal stages ---------- */
export const PORTAL_STAGES = [
  { label: 'Application Started', blurb: "You're officially on your way — we have your basic info." },
  { label: 'Documents Submitted', blurb: "We're gathering the paperwork your loan needs." },
  { label: 'Loan Review', blurb: 'Your loan officer is personally reviewing your file.' },
  { label: 'Underwriting', blurb: 'The lender is double-checking the final details. Hang tight!' },
  { label: 'Final Approval', blurb: "You're approved! We're getting your closing ready." },
  { label: 'Closing', blurb: 'Sign the papers, get the keys.' },
]

export const portalStageIndex = (status) =>
  ({
    'New Lead': 0,
    'Contacted': 0,
    'Application Started': 0,
    'Documents Needed': 1,
    'In Review': 2,
    'Pre-Approved': 2,
    'Underwriting': 3,
    'Clear to Close': 4,
    'Closed': 5,
    'Lost': 0,
  })[status] ?? 0

/* ---------- team ---------- */
export const OFFICERS = [
  {
    id: 'julene',
    name: 'Julene Stewart',
    role: 'Sr. Loan Officer',
    nmls: 'NMLS #1391365',
    phone: '(601) 862-0542',
    email: 'julene@mslending.net',
    color: 'bg-violet-600',
    initials: 'JS',
  },
]

export const officerById = (id) => OFFICERS.find((o) => o.id === id) ?? OFFICERS[0]

export const SOURCES = ['Realtor Referral', 'Past Client', 'Zillow', 'Facebook', 'Website', 'Walk-in']

/* ============================================================
   REAL ESTATE AGENT PARTNERS — the referral network. The whole
   point: agents send buyers, watch their deals live, and close
   faster with MS Lending. (All agents are fictional sample data.)
   ============================================================ */
export const AGENTS = [
  {
    id: 'holly',
    name: 'Holly Sandifer',
    brokerage: 'McIntosh & Co. Realtors',
    market: 'Madison',
    phone: '(601) 555-0411',
    email: 'holly@mcintoshrealtors.com',
    color: 'bg-rose-500',
    initials: 'HS',
    since: '2021',
  },
  {
    id: 'bree',
    name: 'Bree Thompson',
    brokerage: 'Magnolia Realty Group',
    market: 'Brandon',
    phone: '(601) 555-0428',
    email: 'bree@magnoliarealty.com',
    color: 'bg-indigo-500',
    initials: 'BT',
    since: '2023',
  },
  {
    id: 'carl',
    name: 'Carl Jenkins',
    brokerage: 'Crossgates Realty',
    market: 'Pearl & Flowood',
    phone: '(601) 555-0436',
    email: 'carl@crossgatesrealty.com',
    color: 'bg-amber-600',
    initials: 'CJ',
    since: '2022',
  },
]

export const agentById = (id) => AGENTS.find((a) => a.id === id) ?? null

/* deals attributed to an agent (their buyers financed with us) */
export const agentDeals = (borrowers, agentId) => borrowers.filter((b) => b.agentId === agentId)

/* ---------- partner tiers — status worth defending ---------- */
export const TIERS = {
  gold: {
    label: 'Gold Partner',
    cls: 'bg-amber-50 text-amber-700 ring-amber-600/30',
    chip: '🥇',
    min: 1000000,
    perks: ['Priority underwriting queue', 'Weekend letter desk', 'Co-marketing budget', 'Same-hour referral callback'],
  },
  silver: {
    label: 'Silver Partner',
    cls: 'bg-slate-100 text-slate-600 ring-slate-400/40',
    chip: '🥈',
    min: 400000,
    perks: ['Priority underwriting queue', 'Same-day referral callback'],
  },
  bronze: {
    label: 'Bronze Partner',
    cls: 'bg-orange-50 text-orange-700 ring-orange-600/25',
    chip: '🥉',
    min: 0,
    perks: ['Live buyer tracking', 'Next-day referral callback'],
  },
}

/* tier = total attributed volume (active + closed) with MS Lending */
export const agentTier = (borrowers, agentId) => {
  const volume = agentDeals(borrowers, agentId).reduce((s, b) => s + b.amount, 0)
  const id = volume >= TIERS.gold.min ? 'gold' : volume >= TIERS.silver.min ? 'silver' : 'bronze'
  const next = id === 'gold' ? null : id === 'silver' ? 'gold' : 'silver'
  return { id, ...TIERS[id], volume, next, toNext: next ? TIERS[next].min - volume : 0 }
}

/* buyer intros WE sent the agent — the other half of the ledger.
   (LO Ninja never shows agents a balanced two-way scoreboard.) */
export const SEED_AGENT_INTROS = {
  holly: [
    { name: 'Monica H.', date: d(-21), note: 'Pre-approved buyer, needed an agent in Madison' },
    { name: 'Greg T.', date: d(-9), note: 'Relocation buyer — touring this weekend' },
  ],
  bree: [{ name: 'Alisha P.', date: d(-15), note: 'First-time buyer, Brandon schools' }],
  carl: [{ name: 'Devon M.', date: d(-30), note: 'Investor — two rentals in Pearl' }],
}

/* ============================================================
   SEED MESSAGES — real two-way borrower threads for the Inbox.
   dir: 'out' = from the loan officer, 'in' = from the borrower.
   ============================================================ */
const at = (n, t) => `${d(n)}T${t}:00`
export const SEED_MESSAGES = {
  b2: [
    { id: 'm1', dir: 'out', channel: 'sms', body: 'Hi Devin — still need May pay stubs and both bank statements to keep things moving. Can you get those up this week?', at: at(-4, '09:12'), read: true },
    { id: 'm2', dir: 'in', channel: 'sms', body: 'Hey! Yes, Alyssa is grabbing the pay stubs tonight. I can send bank statements now.', at: at(-4, '12:48'), read: true },
    { id: 'm3', dir: 'out', channel: 'sms', body: 'Perfect, thank you! Upload anytime from the link I texted you.', at: at(-3, '08:30'), read: true },
    { id: 'm4', dir: 'in', channel: 'sms', body: 'Just sent the bank statements 👍', at: at(-2, '17:05'), read: false },
  ],
  b10: [
    { id: 'm1', dir: 'out', channel: 'sms', body: 'Hi Sandra, checking in — we’re still missing pay stubs, bank statements, and tax returns. Want to knock these out this week?', at: at(-9, '10:20'), read: true },
    { id: 'm2', dir: 'in', channel: 'sms', body: 'So sorry, I’ve been traveling for work! Back Friday and I’ll send everything then.', at: at(-8, '19:40'), read: true },
    { id: 'm3', dir: 'out', channel: 'sms', body: 'No rush at all — whenever you’re back. We’re ready on our end.', at: at(-1, '11:15'), read: true },
  ],
  b8: [
    { id: 'm1', dir: 'out', channel: 'email', body: 'Brittany — huge news: you’re CLEAR TO CLOSE! 🎉 Closing is set for Friday at 10am, Madison Title Co. I’ll send the final numbers tomorrow.', at: at(-1, '15:02'), read: true },
    { id: 'm2', dir: 'in', channel: 'email', body: 'OMG THANK YOU!!! I can’t believe it’s finally happening. See you Friday!!', at: at(-1, '15:31'), read: false },
  ],
  b1: [
    { id: 'm1', dir: 'out', channel: 'sms', body: 'Hi Carla, this is Julene at MS Lending following up on your Zillow inquiry — do you have a few minutes this afternoon to talk about getting pre-qualified?', at: at(0, '08:45'), read: true },
  ],
}

/* co-branded apply link: the agent shares it, the LO gets the lead,
   the agent gets the credit */
export const agentApplyLink = (officer, agent) => `${APPLY_BASE}/${officer.id}/${agent.id}`

export const LOAN_TYPES = ['Conventional', 'FHA', 'VA', 'USDA', 'Jumbo']

/* MS Lending's real secure online application (the 1003 portal).
   The website "Apply Now" buttons point here today; the goal is to route
   them through this workspace later. */
export const APPLY_URL = 'https://mslending.my1003app.com/102016'
export const APPLY_TAGLINE = 'Apply for a mortgage online in minutes.'
export const APPLY_STEPS = [
  'Complete the secure online form — about 10 minutes.',
  'Your loan officer reaches out to guide you through.',
  'Together you finalize documents and lock your rate.',
]

/* per-officer apply link — what each loan officer shares so leads
   route to them, get captured here, then continue to the 1003 app. */
export const APPLY_BASE = 'apply.mslending.net'
export const applyLinkFor = (officer) => `${APPLY_BASE}/${officer.id}`

/* officer profiles (Julene's details are real, from mslending.net) */
export const OFFICER_PROFILES = {
  julene: {
    since: '28+ years in real estate (since 1995)',
    specialties: ['Home purchase financing', 'Refinancing', 'Personalized lending advice'],
    bio: 'Julene began her career as a secretary for a real estate attorney and worked as a paralegal until 2016, when she became a loan originator at Fidelity Mortgage. She joined MS Lending in March 2023 following Fidelity’s merger. Originally from upstate New York, she relocated to Mississippi in 2006.',
    community: [
      'Secretary, Madison County Chamber of Commerce',
      'Member, Association of Independent Mortgage Experts (AIME)',
      'National Vice Chair, Broker Action Coalition PAC',
      'Certified Financial Counselor',
      'Director, Madison County First Responder Fund',
      'Founding Member, Mortgage Women of Mississippi',
      'Member, MSCHIP',
    ],
  },
}

/* ============================================================
   SAMPLE BORROWERS — entirely fictional people & numbers
   ============================================================ */
const B = (o) => ({
  coBorrower: null,
  state: 'MS',
  term: 30,
  estClosing: null,
  lastContact: null,
  agentId: null,
  notes: [],
  timeline: [],
  ...o,
})

export const SEED_BORROWERS = [
  B({
    id: 'b1',
    name: 'Carla Simmons',
    phone: '(601) 555-0114',
    email: 'carla.simmons@example.com',
    loanType: 'FHA',
    purpose: 'Purchase',
    amount: 212400,
    propertyValue: 236000,
    rate: 6.49,
    creditScore: 684,
    city: 'Brandon',
    propertyAddress: '118 Periwinkle Cove, Brandon, MS 39042',
    employer: 'St. Dominic Health — RN',
    source: 'Zillow',
    status: 'New Lead',
    officerId: 'julene',
    createdAt: d(-1),
    stageEnteredAt: d(-1),
    nextFollowUp: d(0),
    docs: docsFor('Purchase'),
    notes: [
      { id: 'n1', author: 'Julene Stewart', date: d(-1), text: 'Zillow lead. Pre-qualifying around $215k, wants the Brandon school district. Best time to call is after 3pm.' },
    ],
    timeline: [
      { date: d(-1), type: 'created', text: 'Lead created from Zillow' },
      { date: d(0), type: 'call', text: 'Intro call — left a friendly voicemail' },
    ],
  }),

  B({
    id: 'b2',
    name: 'Devin Carter',
    coBorrower: 'Alyssa Carter',
    phone: '(601) 555-0127',
    email: 'devin.alyssa.carter@example.com',
    loanType: 'Conventional',
    purpose: 'Purchase',
    amount: 389000,
    propertyValue: 432000,
    rate: 6.25,
    creditScore: 748,
    city: 'Madison',
    propertyAddress: '412 Hartfield Place, Madison, MS 39110',
    employer: 'Entergy — Engineer / Madison County Schools — Teacher',
    source: 'Realtor Referral',
    agentId: 'holly',
    status: 'Documents Needed',
    officerId: 'julene',
    createdAt: d(-12),
    stageEnteredAt: d(-6),
    lastContact: d(-4),
    nextFollowUp: d(-2),
    estClosing: d(34),
    docs: docsFor('Purchase', ['Approved', 'Requested', 'Needed', 'Uploaded', 'Requested', 'Approved', 'Approved', 'Needed', 'Needed']),
    notes: [
      { id: 'n1', author: 'Julene Stewart', date: d(-4), text: 'Alyssa is gathering May pay stubs. They close on their lease July 31 — keep this one moving.' },
      { id: 'n2', author: 'Julene Stewart', date: d(-6), text: 'W-2s look good. Still waiting on bank statements from both.' },
    ],
    timeline: [
      { date: d(-12), type: 'created', text: 'Lead created — referred by Holly Sandifer (Realtor)' },
      { date: d(-11), type: 'call', text: 'Intro call with Devin — pre-qualified at $400k' },
      { date: d(-9), type: 'status', text: 'Application started' },
      { date: d(-6), type: 'doc', text: 'Document request sent (7 items)' },
      { date: d(-5), type: 'doc', text: 'W-2s uploaded by borrower' },
      { date: d(-4), type: 'call', text: 'Checked in with Alyssa re: pay stubs' },
    ],
  }),

  B({
    id: 'b3',
    name: 'Renee Walker',
    phone: '(601) 555-0139',
    email: 'renee.walker@example.com',
    loanType: 'VA',
    purpose: 'Cash-Out Refinance',
    amount: 186500,
    propertyValue: 264000,
    rate: 6.125,
    creditScore: 712,
    city: 'Jackson',
    propertyAddress: '2204 Meadowbrook Rd, Jackson, MS 39211',
    employer: 'VA Medical Center — Admin',
    source: 'Past Client',
    status: 'Underwriting',
    officerId: 'julene',
    createdAt: d(-31),
    stageEnteredAt: d(-13),
    lastContact: d(-7),
    nextFollowUp: d(1),
    estClosing: d(12),
    rateLockExpires: d(9),
    docs: docsFor('Refinance', ['Approved', 'Approved', 'Approved', 'Approved', 'Approved', 'Approved', 'Approved', 'Approved', 'Reviewed']),
    notes: [
      { id: 'n1', author: 'Julene Stewart', date: d(-7), text: 'Underwriter asked for an updated VOE — handling it now. Renee is using cash-out for her kitchen remodel.' },
    ],
    timeline: [
      { date: d(-31), type: 'created', text: 'Returning client — closed her purchase with us in 2023' },
      { date: d(-29), type: 'status', text: 'Application started' },
      { date: d(-24), type: 'doc', text: 'All documents uploaded' },
      { date: d(-18), type: 'status', text: 'Pre-approved — file packaged' },
      { date: d(-13), type: 'status', text: 'Submitted to underwriting' },
      { date: d(-7), type: 'note', text: 'Underwriter condition: updated employment verification' },
    ],
  }),

  B({
    id: 'b4',
    name: 'Tasha Bell',
    phone: '(601) 555-0152',
    email: 'tasha.bell@example.com',
    loanType: 'FHA',
    purpose: 'Purchase',
    amount: 158900,
    propertyValue: 172000,
    rate: 6.55,
    creditScore: 661,
    city: 'Pearl',
    propertyAddress: '37 Brookwood Dr, Pearl, MS 39208',
    employer: 'Amazon Fulfillment — Team Lead',
    source: 'Facebook',
    status: 'Contacted',
    officerId: 'julene',
    createdAt: d(-4),
    stageEnteredAt: d(-3),
    lastContact: d(-3),
    nextFollowUp: d(1),
    docs: docsFor('Purchase'),
    notes: [
      { id: 'n1', author: 'Julene Stewart', date: d(-3), text: 'First-time buyer, a little nervous about the process. Walked her through FHA basics — she felt much better. Sending app link tomorrow.' },
    ],
    timeline: [
      { date: d(-4), type: 'created', text: 'Lead created from Facebook ad' },
      { date: d(-3), type: 'call', text: 'Intro call — explained FHA first-time buyer options' },
    ],
  }),

  B({
    id: 'b5',
    name: 'Jordan Ellis',
    coBorrower: 'Maya Ellis',
    phone: '(601) 555-0165',
    email: 'the.ellis.family@example.com',
    loanType: 'Conventional',
    purpose: 'Purchase',
    amount: 274500,
    propertyValue: 305000,
    rate: 6.375,
    creditScore: 765,
    city: 'Flowood',
    propertyAddress: '509 Lakeland Trace, Flowood, MS 39232',
    employer: 'Baptist Medical — PT / Self-employed designer',
    source: 'Realtor Referral',
    agentId: 'holly',
    status: 'Pre-Approved',
    preApprovalMax: 280000,
    officerId: 'julene',
    createdAt: d(-16),
    stageEnteredAt: d(-2),
    lastContact: d(-2),
    nextFollowUp: d(3),
    estClosing: d(40),
    docs: docsFor('Purchase', ['Approved', 'Approved', 'Approved', 'Approved', 'Reviewed', 'Uploaded', 'Approved', 'Needed', 'Approved']),
    notes: [
      { id: 'n1', author: 'Julene Stewart', date: d(-2), text: 'Pre-approval letter sent at $280k. They’re making an offer on Lakeland Trace this weekend. 🤞' },
    ],
    timeline: [
      { date: d(-16), type: 'created', text: 'Lead created — referred by Holly Sandifer (Realtor)' },
      { date: d(-14), type: 'status', text: 'Application started' },
      { date: d(-10), type: 'doc', text: 'Document request sent' },
      { date: d(-5), type: 'doc', text: 'Tax returns reviewed (self-employment income OK)' },
      { date: d(-2), type: 'status', text: 'Pre-approved at $280,000 — letter sent' },
    ],
  }),

  B({
    id: 'b6',
    name: 'Gloria Hampton',
    phone: '(601) 555-0171',
    email: 'gloria.hampton@example.com',
    loanType: 'USDA',
    purpose: 'Purchase',
    amount: 204750,
    propertyValue: 215000,
    rate: 6.3,
    creditScore: 698,
    city: 'Clinton',
    propertyAddress: '88 Tinnin Rd, Clinton, MS 39056',
    employer: 'Mississippi College — Registrar Office',
    source: 'Website',
    agentId: 'carl',
    status: 'In Review',
    officerId: 'julene',
    createdAt: d(-9),
    stageEnteredAt: d(-3),
    lastContact: d(-3),
    nextFollowUp: d(0),
    estClosing: d(45),
    docs: docsFor('Purchase', ['Approved', 'Uploaded', 'Uploaded', 'Approved', 'Uploaded', 'Approved', 'Approved', 'Needed', 'Requested']),
    notes: [
      { id: 'n1', author: 'Julene Stewart', date: d(-3), text: 'USDA eligibility confirmed for the Tinnin Rd property. Reviewing income docs today.' },
    ],
    timeline: [
      { date: d(-9), type: 'created', text: 'Lead created from website application' },
      { date: d(-8), type: 'call', text: 'Intro call — USDA fit confirmed' },
      { date: d(-6), type: 'doc', text: 'Document request sent' },
      { date: d(-3), type: 'status', text: 'File moved to review' },
    ],
  }),

  B({
    id: 'b7',
    name: 'Marcus Reed',
    phone: '(601) 555-0118',
    email: 'marcus.reed@example.com',
    loanType: 'Conventional',
    purpose: 'Refinance',
    amount: 231000,
    propertyValue: 318000,
    rate: 6.0,
    creditScore: 731,
    city: 'Ridgeland',
    propertyAddress: '1430 Rice Rd, Ridgeland, MS 39157',
    employer: 'C Spire — Account Manager',
    source: 'Past Client',
    status: 'Application Started',
    officerId: 'julene',
    createdAt: d(-8),
    stageEnteredAt: d(-5),
    lastContact: d(-5),
    nextFollowUp: d(-1),
    docs: docsFor('Refinance', ['Uploaded', 'Needed', 'Needed', 'Needed', 'Needed', 'Uploaded', 'Approved', 'Needed', 'Needed']),
    notes: [
      { id: 'n1', author: 'Julene Stewart', date: d(-5), text: 'Wants to drop PMI and shave his rate. App is half-finished — nudge him to wrap it up.' },
    ],
    timeline: [
      { date: d(-8), type: 'created', text: 'Past client — called about refinancing' },
      { date: d(-7), type: 'call', text: 'Ran refi numbers — saves ~$240/mo' },
      { date: d(-5), type: 'status', text: 'Application started online' },
    ],
  }),

  B({
    id: 'b8',
    name: 'Brittany Foster',
    phone: '(601) 555-0193',
    email: 'brittany.foster@example.com',
    loanType: 'FHA',
    purpose: 'Purchase',
    amount: 196300,
    propertyValue: 214500,
    rate: 6.45,
    creditScore: 672,
    city: 'Madison',
    propertyAddress: '233 Sundial Rd, Madison, MS 39110',
    employer: 'Merit Health — Billing Specialist',
    source: 'Realtor Referral',
    agentId: 'bree',
    status: 'Clear to Close',
    preApprovalMax: 215000,
    officerId: 'julene',
    createdAt: d(-38),
    stageEnteredAt: d(-2),
    lastContact: d(-1),
    nextFollowUp: d(2),
    estClosing: d(5),
    rateLockExpires: d(7),
    docs: docsFor('Purchase', ['Approved', 'Approved', 'Approved', 'Approved', 'Approved', 'Approved', 'Approved', 'Approved', 'Approved']),
    notes: [
      { id: 'n1', author: 'Julene Stewart', date: d(-1), text: `CTC! Closing set for ${fmtDateFull(d(5))} at 10am, Madison Title Co. Brittany is SO excited — first home.` },
    ],
    timeline: [
      { date: d(-38), type: 'created', text: 'Lead created — realtor referral' },
      { date: d(-34), type: 'status', text: 'Application started' },
      { date: d(-26), type: 'doc', text: 'All documents approved' },
      { date: d(-19), type: 'status', text: 'Submitted to underwriting' },
      { date: d(-2), type: 'status', text: 'Clear to close 🎉' },
      { date: d(-1), type: 'call', text: 'Confirmed closing time with Brittany & title company' },
    ],
  }),

  B({
    id: 'b9',
    name: 'Anthony Boyd',
    coBorrower: 'Keisha Boyd',
    phone: '(601) 555-0148',
    email: 'boyd.family@example.com',
    loanType: 'VA',
    purpose: 'Purchase',
    amount: 312000,
    propertyValue: 349000,
    rate: 6.1,
    creditScore: 729,
    city: 'Brandon',
    propertyAddress: '604 Crossgates Blvd, Brandon, MS 39042',
    employer: 'US Army (Ret.) / Rankin County Schools',
    source: 'Website',
    agentId: 'bree',
    status: 'Underwriting',
    preApprovalMax: 350000,
    officerId: 'julene',
    createdAt: d(-22),
    stageEnteredAt: d(-6),
    lastContact: d(-2),
    nextFollowUp: d(2),
    estClosing: d(18),
    rateLockExpires: d(4),
    docs: docsFor('Purchase', ['Approved', 'Approved', 'Approved', 'Approved', 'Approved', 'Approved', 'Approved', 'Uploaded', 'Approved']),
    notes: [
      { id: 'n1', author: 'Julene Stewart', date: d(-2), text: 'COE verified. Appraisal came back at value — told Keisha, she was thrilled.' },
    ],
    timeline: [
      { date: d(-22), type: 'created', text: 'Lead created from website' },
      { date: d(-20), type: 'status', text: 'Application started' },
      { date: d(-13), type: 'status', text: 'Pre-approved' },
      { date: d(-6), type: 'status', text: 'Submitted to underwriting' },
      { date: d(-3), type: 'doc', text: 'Appraisal received — at value' },
      { date: d(-2), type: 'email', text: 'Emailed Keisha the appraisal news — they were thrilled' },
    ],
  }),

  B({
    id: 'b10',
    name: 'Sandra Pickett',
    phone: '(601) 555-0181',
    email: 'sandra.pickett@example.com',
    loanType: 'Conventional',
    purpose: 'Purchase',
    amount: 342800,
    propertyValue: 381000,
    rate: 6.25,
    creditScore: 754,
    city: 'Jackson',
    propertyAddress: '4521 Old Canton Rd, Jackson, MS 39211',
    employer: 'Trustmark Bank — Branch Manager',
    source: 'Zillow',
    status: 'Documents Needed',
    officerId: 'julene',
    createdAt: d(-24),
    stageEnteredAt: d(-16),
    lastContact: d(-9),
    nextFollowUp: d(-4),
    estClosing: d(28),
    docs: docsFor('Purchase', ['Approved', 'Requested', 'Requested', 'Approved', 'Needed', 'Approved', 'Approved', 'Needed', 'Requested']),
    notes: [
      { id: 'n1', author: 'Julene Stewart', date: d(-9), text: 'Sandra has been traveling for work. Still missing pay stubs, bank statements, tax returns. File is stalling — call this week!' },
    ],
    timeline: [
      { date: d(-24), type: 'created', text: 'Lead created from Zillow' },
      { date: d(-21), type: 'status', text: 'Application started' },
      { date: d(-16), type: 'doc', text: 'Document request sent (6 items)' },
      { date: d(-9), type: 'call', text: 'Left voicemail re: missing documents' },
    ],
  }),

  B({
    id: 'b11',
    name: 'Felicia Grant',
    phone: '(601) 555-0125',
    email: 'felicia.grant@example.com',
    loanType: 'Conventional',
    purpose: 'Cash-Out Refinance',
    amount: 145000,
    propertyValue: 232000,
    rate: 6.5,
    creditScore: 707,
    city: 'Flowood',
    propertyAddress: '12 Grandview Cir, Flowood, MS 39232',
    employer: 'Self-employed — Salon Owner',
    source: 'Facebook',
    status: 'New Lead',
    officerId: 'julene',
    createdAt: d(-2),
    stageEnteredAt: d(-2),
    nextFollowUp: d(1),
    docs: docsFor('Refinance'),
    notes: [
      { id: 'n1', author: 'Julene Stewart', date: d(-2), text: 'Messaged us on Facebook — wants cash out to expand her salon. Self-employed, so flag tax returns early.' },
    ],
    timeline: [
      { date: d(-2), type: 'created', text: 'Lead created from Facebook message' },
    ],
  }),

  B({
    id: 'b12',
    name: 'Tom Lawson',
    coBorrower: 'Erica Lawson',
    phone: '(601) 555-0157',
    email: 'lawsons@example.com',
    loanType: 'Jumbo',
    purpose: 'Purchase',
    amount: 612000,
    propertyValue: 689000,
    rate: 6.6,
    creditScore: 788,
    city: 'Madison',
    propertyAddress: '105 Ashbrooke Blvd, Madison, MS 39110',
    employer: 'Lawson Dental Group — Owners',
    source: 'Realtor Referral',
    agentId: 'holly',
    status: 'In Review',
    officerId: 'julene',
    createdAt: d(-11),
    stageEnteredAt: d(-4),
    lastContact: d(-1),
    nextFollowUp: d(1),
    estClosing: d(37),
    docs: docsFor('Purchase', ['Approved', 'Approved', 'Uploaded', 'Uploaded', 'Uploaded', 'Approved', 'Approved', 'Requested', 'Needed']),
    notes: [
      { id: 'n1', author: 'Julene Stewart', date: d(-1), text: 'Jumbo file — two years of returns in. Reviewing practice income. Strong borrowers.' },
    ],
    timeline: [
      { date: d(-11), type: 'created', text: 'Lead created — realtor referral' },
      { date: d(-9), type: 'status', text: 'Application started' },
      { date: d(-6), type: 'doc', text: 'Tax returns & W-2s uploaded' },
      { date: d(-4), type: 'status', text: 'File moved to review' },
      { date: d(-1), type: 'email', text: 'Emailed Tom about the practice income review' },
    ],
  }),

  B({
    id: 'b13',
    name: 'Denise Carver',
    phone: '(601) 555-0169',
    email: 'denise.carver@example.com',
    loanType: 'FHA',
    purpose: 'Purchase',
    amount: 173250,
    propertyValue: 189000,
    rate: 6.4,
    creditScore: 668,
    city: 'Clinton',
    propertyAddress: '76 Easthaven Dr, Clinton, MS 39056',
    employer: 'Clinton Public Schools — Teacher',
    source: 'Past Client',
    agentId: 'carl',
    status: 'Closed',
    officerId: 'julene',
    createdAt: d(-52),
    stageEnteredAt: d(-6),
    lastContact: d(-6),
    nextFollowUp: null,
    estClosing: d(-6),
    docs: docsFor('Purchase', ['Approved', 'Approved', 'Approved', 'Approved', 'Approved', 'Approved', 'Approved', 'Approved', 'Approved']),
    notes: [
      { id: 'n1', author: 'Julene Stewart', date: d(-6), text: 'Closed! Keys in hand. Sending the thank-you gift this week.' },
    ],
    timeline: [
      { date: d(-52), type: 'created', text: 'Lead created — sister of a past client' },
      { date: d(-47), type: 'status', text: 'Application started' },
      { date: d(-30), type: 'status', text: 'Submitted to underwriting' },
      { date: d(-12), type: 'status', text: 'Clear to close' },
      { date: d(-6), type: 'status', text: 'Loan closed 🎉 Welcome home, Denise!' },
    ],
  }),

  B({
    id: 'b14',
    name: 'Ray Holloway',
    phone: '(601) 555-0136',
    email: 'ray.holloway@example.com',
    loanType: 'Conventional',
    purpose: 'Purchase',
    amount: 228000,
    propertyValue: 251000,
    rate: 6.35,
    creditScore: 689,
    city: 'Pearl',
    propertyAddress: '910 Old Whitfield Rd, Pearl, MS 39208',
    employer: 'Nissan Canton — Technician',
    source: 'Zillow',
    status: 'Lost',
    officerId: 'julene',
    createdAt: d(-35),
    stageEnteredAt: d(-20),
    lastContact: d(-20),
    nextFollowUp: null,
    docs: docsFor('Purchase', ['Uploaded', 'Needed', 'Needed', 'Needed', 'Needed', 'Needed', 'Approved', 'Needed', 'Needed']),
    notes: [
      { id: 'n1', author: 'Julene Stewart', date: d(-20), text: 'Decided to keep renting for now. Super nice guy — check back in 6 months, he wants to try again in the spring.' },
    ],
    timeline: [
      { date: d(-35), type: 'created', text: 'Lead created from Zillow' },
      { date: d(-32), type: 'call', text: 'Intro call — pre-qualified' },
      { date: d(-20), type: 'status', text: 'Marked lost — staying in rental, revisit in spring' },
    ],
  }),
]

/* ============================================================
   SAMPLE TASKS
   ============================================================ */
export const TASK_STATUSES = ['To Do', 'In Progress', 'Waiting', 'Complete']

export const PRIORITY_STYLES = {
  High: 'bg-rose-50 text-rose-700 ring-rose-600/20',
  Medium: 'bg-amber-50 text-amber-800 ring-amber-600/25',
  Low: 'bg-slate-50 text-slate-600 ring-slate-400/30',
}

export const SEED_TASKS = [
  { id: 't1', title: 'Call Carla Simmons — intro & pre-qual', borrowerId: 'b1', officerId: 'julene', due: d(0), priority: 'High', status: 'To Do' },
  { id: 't2', title: 'Chase pay stubs & bank statements', borrowerId: 'b2', officerId: 'julene', due: d(0), priority: 'High', status: 'In Progress' },
  { id: 't3', title: 'Review uploaded bank statements', borrowerId: 'b10', officerId: 'julene', due: d(-1), priority: 'High', status: 'To Do' },
  { id: 't4', title: 'Follow up with realtor — Ellis offer', borrowerId: 'b5', officerId: 'julene', due: d(1), priority: 'Medium', status: 'To Do' },
  { id: 't5', title: 'Send updated VOE to underwriter', borrowerId: 'b3', officerId: 'julene', due: d(-3), priority: 'High', status: 'Waiting' },
  { id: 't6', title: 'Schedule closing — Madison Title Co.', borrowerId: 'b8', officerId: 'julene', due: d(2), priority: 'High', status: 'To Do' },
  { id: 't7', title: 'Send pre-approval letter', borrowerId: 'b6', officerId: 'julene', due: d(0), priority: 'Medium', status: 'To Do' },
  { id: 't8', title: 'Follow up — app half-finished', borrowerId: 'b7', officerId: 'julene', due: d(-1), priority: 'Medium', status: 'To Do' },
  { id: 't9', title: 'Review Lawson practice income docs', borrowerId: 'b12', officerId: 'julene', due: d(1), priority: 'Medium', status: 'In Progress' },
  { id: 't10', title: 'Send document request', borrowerId: 'b11', officerId: 'julene', due: d(1), priority: 'Medium', status: 'To Do' },
  { id: 't11', title: 'Order homeowners insurance binder', borrowerId: 'b9', officerId: 'julene', due: d(3), priority: 'Low', status: 'Waiting' },
  { id: 't12', title: 'Send closing gift & thank-you card', borrowerId: 'b13', officerId: 'julene', due: d(-2), priority: 'Low', status: 'Complete' },
  { id: 't13', title: 'Verify employment (VOE)', borrowerId: 'b3', officerId: 'julene', due: d(-6), priority: 'High', status: 'Complete' },
  { id: 't14', title: 'Prep closing package', borrowerId: 'b8', officerId: 'julene', due: d(4), priority: 'Medium', status: 'To Do' },
]

/* leads per week — last 8 weeks (for the dashboard sparkline) */
export const WEEKLY_LEADS = [3, 4, 4, 6, 5, 7, 6, 8]

export const DISCLAIMER =
  'Demo prototype only. Not intended for real borrower data or compliance use.'

/* ---------- time-of-day theming (shared across dashboard, sidebar, login) ---------- */
export const timeOfDay = () => {
  const h = new Date().getHours()
  return h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening'
}

export const SKY = {
  morning: {
    grad: 'from-amber-50 via-rose-50 to-sky-100',
    text: 'text-navy-950',
    muted: 'text-navy-700/60',
    orbBg: 'radial-gradient(circle at 35% 30%, #fef3c7, #fbbf24 70%)',
    glow: 'bg-amber-300/40',
    shadow: '0 0 55px 8px rgba(251,191,36,0.45)',
    accent: 'rgba(251,191,36,0.16)',
    moon: false,
  },
  afternoon: {
    grad: 'from-orange-100 via-rose-100 to-indigo-100',
    text: 'text-navy-950',
    muted: 'text-navy-700/60',
    orbBg: 'radial-gradient(circle at 35% 30%, #fed7aa, #fb7185 72%)',
    glow: 'bg-orange-300/40',
    shadow: '0 0 55px 8px rgba(251,146,60,0.4)',
    accent: 'rgba(251,146,60,0.16)',
    moon: false,
  },
  evening: {
    grad: 'from-indigo-950 via-navy-900 to-slate-900',
    text: 'text-white',
    muted: 'text-navy-200/70',
    orbBg: 'radial-gradient(circle at 35% 30%, #f8fafc, #cbd5e1 80%)',
    glow: 'bg-slate-200/20',
    shadow: '0 0 45px 6px rgba(226,232,240,0.3)',
    accent: 'rgba(129,140,248,0.20)',
    moon: true,
  },
}

/* ============================================================
   INTEGRATIONS — connect email, social, and the rest of the
   tools a loan team already lives in. Every item maps to a server
   adapter in api/_connector-registry.js and reports real readiness.
   `icon` is a string mapped to a Lucide icon in Integrations.jsx.
   ============================================================ */
export const INTEGRATION_CATEGORIES = [
  'Email & Calendar',
  'Social & Lead Sources',
  'Phone & Messaging',
  'Documents & Closing',
  'Automation & Finance',
]

export const INTEGRATIONS = [
  /* ---- Email & Calendar ---- */
  {
    id: 'gmail',
    name: 'Gmail',
    category: 'Email & Calendar',
    icon: 'mail',
    color: '#EA4335',
    blurb: 'Sync borrower emails into each loan file and send right from the workspace.',
    perms: ['Read & send email on your behalf', 'Match messages to borrower files'],
    accountKind: 'email',
    defaultAccount: 'julene@mslending.net',
  },
  {
    id: 'outlook',
    name: 'Outlook',
    category: 'Email & Calendar',
    icon: 'mail',
    color: '#0078D4',
    blurb: 'Connect Microsoft 365 email so the whole team works from one inbox.',
    perms: ['Read & send email on your behalf', 'Sync sent items to timelines'],
    accountKind: 'email',
    defaultAccount: 'team@mslending.net',
  },
  {
    id: 'gcal',
    name: 'Google Calendar',
    category: 'Email & Calendar',
    icon: 'calendar',
    color: '#4285F4',
    blurb: 'Put closings, follow-ups, and appointments on your calendar automatically.',
    perms: ['Create & update calendar events', 'Read your availability'],
    accountKind: 'email',
    defaultAccount: 'julene@mslending.net',
  },

  /* ---- Social & Lead Sources ---- */
  {
    id: 'facebook',
    name: 'Facebook',
    category: 'Social & Lead Sources',
    icon: 'megaphone',
    color: '#1877F2',
    blurb: 'Pull leads from your Facebook page & lead ads straight into the pipeline.',
    perms: ['Read leads from your Page', 'Read Page messages'],
    accountKind: 'page',
    defaultAccount: 'MS Lending, LLC',
  },
  {
    id: 'instagram',
    name: 'Instagram',
    category: 'Social & Lead Sources',
    icon: 'camera',
    color: '#E4405F',
    blurb: 'Capture DMs and profile inquiries as new leads with the source tagged.',
    perms: ['Read direct messages', 'Read profile inquiries'],
    accountKind: 'handle',
    defaultAccount: '@mslending',
  },
  {
    id: 'zillow',
    name: 'Zillow',
    category: 'Social & Lead Sources',
    icon: 'home',
    color: '#006AFF',
    blurb: 'Auto-import Zillow Premier Agent leads the moment they come in.',
    perms: ['Receive Premier Agent leads', 'Sync lead contact details'],
    accountKind: 'account',
    defaultAccount: 'Premier Agent · Julene S.',
  },
  {
    id: 'gbp',
    name: 'Google Business Profile',
    category: 'Social & Lead Sources',
    icon: 'mapPin',
    color: '#34A853',
    blurb: 'Sync locations, reviews, and profile performance from Google Business Profile.',
    perms: ['Read locations and profile details', 'Read review and performance activity'],
    accountKind: 'account',
    defaultAccount: 'MS Lending — Madison, MS',
  },
  {
    id: 'linkedin',
    name: 'LinkedIn',
    category: 'Social & Lead Sources',
    icon: 'briefcase',
    color: '#0A66C2',
    blurb: 'Link staff profiles now and receive lead events after LinkedIn partner approval.',
    perms: ['Read the authorized profile', 'Receive approved Lead Sync events'],
    accountKind: 'handle',
    defaultAccount: 'Julene Stewart',
  },

  /* ---- Phone & Messaging ---- */
  {
    id: 'sms',
    name: 'Text Messaging',
    category: 'Phone & Messaging',
    icon: 'messageSquare',
    color: '#7C3AED',
    blurb: 'Text borrowers from a business number — replies thread into the file.',
    perms: ['Send & receive SMS', 'Attach texts to borrower timelines'],
    accountKind: 'phone',
    defaultAccount: '(601) 651-3959',
  },
  {
    id: 'whatsapp',
    name: 'WhatsApp',
    category: 'Phone & Messaging',
    icon: 'messageCircle',
    color: '#25D366',
    blurb: 'Reach borrowers who prefer WhatsApp, all from one shared inbox.',
    perms: ['Send & receive messages', 'Read delivery status'],
    accountKind: 'phone',
    defaultAccount: '(601) 651-3959',
  },
  {
    id: 'dialer',
    name: 'Phone Dialer',
    category: 'Phone & Messaging',
    icon: 'phone',
    color: '#0B5CFF',
    blurb: 'Click-to-call borrowers and auto-log calls with recordings.',
    perms: ['Place outbound calls', 'Log call duration & notes'],
    accountKind: 'phone',
    defaultAccount: '(601) 651-3959',
  },

  /* ---- Documents & Closing ---- */
  {
    id: 'docusign',
    name: 'DocuSign',
    category: 'Documents & Closing',
    icon: 'penTool',
    color: '#D9A21B',
    blurb: 'Send disclosures and applications for legally-binding e-signature.',
    perms: ['Send documents for signature', 'Track signing status'],
    accountKind: 'email',
    defaultAccount: 'julene@mslending.net',
  },
  {
    id: 'dropbox',
    name: 'Dropbox',
    category: 'Documents & Closing',
    icon: 'cloud',
    color: '#0061FF',
    blurb: 'Back up borrower documents to a secure shared folder automatically.',
    perms: ['Read & write files in a chosen folder'],
    accountKind: 'email',
    defaultAccount: 'docs@mslending.net',
  },

  /* ---- Automation & Finance ---- */
  {
    id: 'zapier',
    name: 'Zapier',
    category: 'Automation & Finance',
    icon: 'zap',
    color: '#FF4F00',
    blurb: 'Wire MS Lending to 6,000+ apps with no-code automations.',
    perms: ['Trigger workflows on new leads & status changes'],
    accountKind: 'email',
    defaultAccount: 'julene@mslending.net',
  },
  {
    id: 'quickbooks',
    name: 'QuickBooks',
    category: 'Automation & Finance',
    icon: 'calculator',
    color: '#2CA01C',
    blurb: 'Sync closed-loan commissions and expenses to your books.',
    perms: ['Create invoices & expense records', 'Read account list'],
    accountKind: 'account',
    defaultAccount: 'MS Lending, LLC',
  },
  {
    id: 'mailchimp',
    name: 'Mailchimp',
    category: 'Automation & Finance',
    icon: 'send',
    color: '#FF5C35',
    blurb: 'Drip nurture campaigns to past clients and long-term leads.',
    perms: ['Sync contacts to audiences', 'Read campaign stats'],
    accountKind: 'email',
    defaultAccount: 'marketing@mslending.net',
  },
]

/* ============================================================
   JOB BOARD — the borrower kanban. These lanes are the loan
   officer's own buckets, independent of pipeline status. A file
   keeps its lane until you drag it somewhere else.
   ============================================================ */
export const BOARD_COLUMNS = [
  { id: 'active',     label: 'Active',      tint: '#357047', soft: 'bg-sage-50 text-sage-700 ring-sage-600/20',     dot: 'bg-sage-500',   blurb: 'Moving toward closing' },
  { id: 'prequalify', label: 'Prequalify',  tint: '#0284c7', soft: 'bg-sky-50 text-sky-700 ring-sky-600/20',        dot: 'bg-sky-500',    blurb: 'Getting them qualified' },
  { id: 'pending',    label: 'Pending',     tint: '#b45309', soft: 'bg-amber-50 text-amber-800 ring-amber-600/25',  dot: 'bg-amber-500',  blurb: 'Waiting on something' },
  { id: 'credit',     label: 'Credit Help', tint: '#be123c', soft: 'bg-rose-50 text-rose-700 ring-rose-600/20',     dot: 'bg-rose-500',   blurb: 'Needs credit work first' },
  { id: 'limbo',      label: 'Limbo',       tint: '#7c3aed', soft: 'bg-violet-50 text-violet-700 ring-violet-600/20', dot: 'bg-violet-500', blurb: 'Stalled — unclear next step' },
  { id: 'misc',       label: 'Misc',        tint: '#475569', soft: 'bg-slate-100 text-slate-600 ring-slate-400/30', dot: 'bg-slate-400',  blurb: 'Everything else' },
]

/* the parked lane, shown on its own to the side */
export const UNACTIVE_COLUMN = {
  id: 'unactive', label: 'Unactive', tint: '#94a3b8',
  soft: 'bg-slate-100 text-slate-500 ring-slate-400/30', dot: 'bg-slate-400', blurb: 'Closed, lost, or on ice',
}

export const ALL_BOARD_COLUMNS = [...BOARD_COLUMNS, UNACTIVE_COLUMN]
export const boardColumnById = (id) => ALL_BOARD_COLUMNS.find((c) => c.id === id) ?? BOARD_COLUMNS[5]

/* where a file lands before anyone drags it — derived from pipeline status */
export const defaultBoardFor = (b) => {
  if (isClosedOut(b)) return 'unactive'
  if (b.status === 'New Lead' || b.status === 'Contacted' || b.status === 'Application Started') return 'prequalify'
  if (b.status === 'Documents Needed') return 'pending'
  return 'active'
}

/* ============================================================
   COMPANY + LEGAL — MS Lending is a mortgage lender; say so loudly,
   and put the real lending disclaimers anywhere a customer can see.
   ============================================================ */
export const COMPANY = {
  name: 'MS Lending, LLC',
  kind: 'Mortgage Lender',
  tagline: 'Mortgage lending for Mississippi families',
  city: 'Madison, MS',
  nmls: 'NMLS #102016',
  phone: '(601) 651-3959',
  site: 'mslending.net',
}

export const LEGAL_LINES = [
  `${COMPANY.name} is a licensed mortgage lender · ${COMPANY.nmls} · Equal Housing Lender.`,
  'This is not a commitment to lend or an offer to extend credit. All loans are subject to credit approval, income and asset verification, and property appraisal. Rates, terms, and program availability may change without notice.',
  'Figures shown are illustrations only and are not financial, tax, or legal advice. Contact MS Lending for terms specific to your situation.',
]

/* SOLVYR — fine-print attribution on every screen */
export const SOLVYR = {
  name: 'SOLVYR',
  url: 'https://www.solvyrsolutions.com',
  program: 'a RIOS program',
}

/* ============================================================
   PORTAL SHARING — the borrower can invite anyone and pick, per
   person, exactly which parts of the portal they're allowed to see.
   ============================================================ */
export const SHARE_ITEMS = [
  { id: 'progress',  label: 'Loan progress & stage' },
  { id: 'documents', label: 'Documents we still need' },
  { id: 'vault',     label: 'Document vault (will, insurance…)' },
  { id: 'facts',     label: 'Loan amount & details' },
  { id: 'chat',      label: 'Group chat' },
  { id: 'officer',   label: 'Loan officer contact' },
]
/* a new invitee starts with the safe, low-sensitivity items on */
export const DEFAULT_SHARE_PERMS = { progress: true, documents: false, vault: false, facts: false, chat: true, officer: true }
export const SHARE_RELATIONS = ['Spouse / Partner', 'Family', 'Real estate agent', 'Attorney', 'Financial advisor', 'Accountant', 'Other']

/* things people keep in a post-closing vault — suggested, plus add your own */
export const VAULT_SUGGESTIONS = [
  'Last Will & Testament',
  'Homeowners Insurance Policy',
  'Property Deed',
  'Closing Disclosure',
  'Estate / Trust Documents',
  'Property Tax Records',
  'Home Warranty',
]

/* a tiny bit of seed so the group chat and vault aren't empty on first look */
export const SEED_PORTAL_CHAT = {
  b3: [
    { id: 'pc1', author: 'Julene Stewart', role: 'Loan Officer', text: 'Hi Renee! Keeping everything in one place here so you can follow along. The updated VOE is the last condition — almost there.', at: at(-6, '10:05') },
    { id: 'pc2', author: 'Renee Walker', role: 'Borrower', text: 'Thank you! My HR said they sent it over this morning.', at: at(-6, '13:20') },
  ],
}

export const SEED_VAULT = {
  b13: [
    { id: 'v1', name: 'Closing Disclosure', status: 'Stored', addedBy: 'MS Lending' },
    { id: 'v2', name: 'Property Deed', status: 'Stored', addedBy: 'MS Lending' },
  ],
}

/* ============================================================
   EMAIL TEMPLATES — starting library the team can edit or add to.
   {first} drops in the borrower's first name when used.
   ============================================================ */
export const SEED_TEMPLATES = [
  {
    id: 'tpl-welcome',
    name: 'Welcome / first contact',
    subject: 'Welcome to MS Lending, {first}',
    body: 'Hi {first},\n\nThanks for reaching out to MS Lending — I’m glad you did. I’ll be your point of contact from here to closing, and my job is to make this simple.\n\nWhen’s a good time for a quick 10-minute call to talk through your goals and get you pre-qualified?\n\nTalk soon,\nMS Lending',
  },
  {
    id: 'tpl-docs',
    name: 'Document request',
    subject: 'A few documents to keep your loan moving',
    body: 'Hi {first},\n\nWe’re ready for the next step and just need a few items from you. A clear phone photo of each works great — no scanner needed.\n\nYou can upload them anytime from your borrower portal and we’ll take it from there.\n\nThank you,\nMS Lending',
  },
  {
    id: 'tpl-preapproval',
    name: 'Pre-approval letter',
    subject: 'You’re pre-approved with MS Lending 🎉',
    body: 'Hi {first},\n\nGreat news — you’re pre-approved! Your letter is attached, so you can make offers with confidence.\n\nThe moment you find a home you love, send it my way and we’ll move fast.\n\nCongratulations,\nMS Lending',
  },
  {
    id: 'tpl-status',
    name: 'Status check-in',
    subject: 'Quick update on your loan',
    body: 'Hi {first},\n\nJust a quick note so you’re never left wondering — here’s where your loan stands today. Nothing is needed from you right now; we’ll reach out the moment that changes.\n\nAlways here if you have questions,\nMS Lending',
  },
  {
    id: 'tpl-closing',
    name: 'Closing confirmation',
    subject: 'Your closing details',
    body: 'Hi {first},\n\nWe’re almost there! Here are your closing details. Please bring a government-issued photo ID, and reach out if anything has changed on your end.\n\nAlmost home,\nMS Lending',
  },
  {
    id: 'tpl-postclose',
    name: 'Post-closing check-in',
    subject: 'Checking in — and a place to keep your documents',
    body: 'Hi {first},\n\nCongratulations again on your home! A quick reminder: your MS Lending portal stays open. You can keep your closing documents, insurance, and other important paperwork in your secure vault — and share it with family or your attorney whenever you need.\n\nWe’re always one call away,\nMS Lending',
  },
  {
    id: 'tpl-rate',
    name: 'Rate-drop opportunity',
    subject: 'Rates moved — worth a quick look?',
    body: 'Hi {first},\n\nRates have come down since we closed your loan, and a refinance might lower your payment. It only takes a few minutes to run the numbers — no obligation.\n\nWant me to take a look for you?\n\nMS Lending',
  },
  {
    id: 'tpl-review',
    name: 'Review / referral request',
    subject: 'It was a joy working with you',
    body: 'Hi {first},\n\nHelping you get home was the best part of our week. If you have a minute, a quick review means the world to a small Mississippi team like ours — and if anyone you know is thinking about buying or refinancing, we’d love to help them too.\n\nWith gratitude,\nMS Lending',
  },
]

/* ---- Social media (sample analytics shown until a platform is connected +
   provider-approved, then real posts/metrics flow in via the connectors) ---- */
export const SOCIAL_ACCOUNTS = [
  { id: 'facebook', name: 'Facebook', handle: 'MS Lending, LLC', icon: 'megaphone', color: '#1877F2', followers: 2840, growth: 3.2 },
  { id: 'instagram', name: 'Instagram', handle: '@mslending', icon: 'camera', color: '#E4405F', followers: 1910, growth: 5.8 },
  { id: 'linkedin', name: 'LinkedIn', handle: 'Julene Stewart', icon: 'briefcase', color: '#0A66C2', followers: 1240, growth: 1.4 },
]

export const SOCIAL_POSTS = [
  { id: 'sp1', platform: 'instagram', date: d(-1), caption: 'Rates just dipped — here’s what it does to a $300k payment 📉', likes: 168, comments: 24, shares: 11, reach: 4120, tone: 'from-rose-400 to-orange-300' },
  { id: 'sp2', platform: 'facebook', date: d(-3), caption: 'Congrats to the Hendersons on closing their first home! 🔑🏡', likes: 312, comments: 47, shares: 28, reach: 6800, tone: 'from-sky-400 to-indigo-300' },
  { id: 'sp3', platform: 'instagram', date: d(-5), caption: 'First-time buyer? 3 things to fix on your credit before you apply 👇', likes: 204, comments: 31, shares: 19, reach: 5230, tone: 'from-violet-400 to-fuchsia-300' },
  { id: 'sp4', platform: 'linkedin', date: d(-6), caption: 'What 28 years in Mississippi lending taught me about getting to the closing table.', likes: 96, comments: 14, shares: 7, reach: 2980, tone: 'from-navy-400 to-sky-300' },
  { id: 'sp5', platform: 'facebook', date: d(-9), caption: 'Myth: you need 20% down. Reality: programs from 3% (and some 0%). Ask us.', likes: 141, comments: 22, shares: 33, reach: 5140, tone: 'from-sage-400 to-teal-300' },
  { id: 'sp6', platform: 'instagram', date: d(-12), caption: 'Pre-approved in 24 hours — here’s exactly what to send us 📋', likes: 187, comments: 16, shares: 9, reach: 3870, tone: 'from-amber-400 to-rose-300' },
]

export const socialSummary = (posts = SOCIAL_POSTS, accounts = SOCIAL_ACCOUNTS) => {
  const followers = accounts.reduce((n, a) => n + a.followers, 0)
  const reach = posts.reduce((n, p) => n + (p.reach || 0), 0)
  const engagements = posts.reduce((n, p) => n + (p.likes || 0) + (p.comments || 0) + (p.shares || 0), 0)
  const engagementRate = reach ? Math.round((engagements / reach) * 1000) / 10 : 0
  return { followers, reach, engagementRate, posts: posts.length }
}

/* ---- Google Business Profile (reviews / rating) ----
   Sample data until the GBP connector is authorized; then it's replaced by
   live reviews from the Google Business Profile API. */
export const GBP_PROFILE = {
  name: 'MS Lending — Julene Stewart',
  rating: 4.9,
  reviewCount: 63,
  views30d: 1840,
  calls30d: 27,
  direction30d: 19,
}

export const GBP_REVIEWS = [
  { id: 'gr1', author: 'Monica H.', rating: 5, date: d(-3), text: 'Julene made our first home purchase painless — explained every step and got us a great rate. Cannot recommend enough!', reply: 'Thank you Monica! So happy for you and the family. 🏡' },
  { id: 'gr2', author: 'David & Sarah P.', rating: 5, date: d(-8), text: 'Refinanced with Julene and saved almost $300/month. Fast, honest, and always answered our calls.', reply: '' },
  { id: 'gr3', author: 'Tom L.', rating: 5, date: d(-14), text: 'Self-employed and thought I’d never qualify. Julene found a program that worked. Closed on time.', reply: 'Appreciate you, Tom — congrats again!' },
  { id: 'gr4', author: 'Anthony B.', rating: 4, date: d(-21), text: 'Great experience overall. A little back-and-forth on documents but Julene kept it moving.', reply: '' },
  { id: 'gr5', author: 'Carla S.', rating: 5, date: d(-29), text: 'Professional, patient, and genuinely cared. She treats you like family, not a transaction.', reply: '' },
]

export const gbpSummary = (reviews = GBP_REVIEWS, profile = GBP_PROFILE) => {
  const count = reviews.length || profile.reviewCount
  const avg = reviews.length ? Math.round((reviews.reduce((n, r) => n + r.rating, 0) / reviews.length) * 10) / 10 : profile.rating
  const replied = reviews.filter((r) => r.reply && r.reply.trim()).length
  return { rating: avg, reviewCount: profile.reviewCount, replied, needsReply: reviews.length - replied }
}
