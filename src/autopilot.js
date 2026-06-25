/* ============================================================
   AUTOPILOT — the "runs itself, with human review" engine.
   Pure logic: given the pipeline, it decides the next action for
   each loan and pre-writes the message. Julene reviews & sends.
   ============================================================ */
import {
  isOverdue,
  isStuck,
  isClosedOut,
  missingDocs,
  daysInStage,
  daysUntil,
  NEXT_STEP,
  officerById,
  agentById,
  money,
  fmtDateFull,
} from './data.js'

/* warm, on-brand drafts — channel + (subject) + body */
function draftFor(kind, b, officer) {
  const first = b.name.split(' ')[0]
  const off = officer?.name?.split(' ')[0] ?? 'your loan officer'
  const step = (NEXT_STEP[b.status] ?? '').replace(/\.$/, '')
  switch (kind) {
    case 'referral-callback': {
      const agent = b.agentId ? agentById(b.agentId) : null
      return {
        channel: 'sms',
        body: `Hi ${first}! This is ${off} with MS Lending${agent ? ` — ${agent.name.split(' ')[0]} connected us about your home financing` : ''}. I’d love to help you get pre-qualified. Do you have a few minutes today for a quick call?`,
      }
    }
    case 'overdue-followup':
      return {
        channel: 'sms',
        body: `Hi ${first}, ${off} here at MS Lending — just checking in on your ${b.loanType} loan. ${step ? step.charAt(0).toUpperCase() + step.slice(1) + '.' : ''} Anything I can do to help keep things moving?`,
      }
    case 'closing-soon':
      return {
        channel: 'email',
        subject: `Your closing is coming up — ${fmtDateFull(b.estClosing)}`,
        body: `Hi ${first},\n\nExciting — your closing is set for ${fmtDateFull(b.estClosing)}! I’m confirming the final details now and will send your exact numbers shortly. If anything has changed on your end, just reply here.\n\nAlmost home,\n${officer?.name ?? 'MS Lending'}\nMS Lending`,
      }
    case 'doc-request': {
      const missing = missingDocs(b).map((x) => x.name)
      const list = missing.length ? missing.map((n) => `• ${n}`).join('\n') : '• (your loan officer will confirm)'
      return {
        channel: 'email',
        subject: `A few documents to keep your ${b.loanType} loan moving`,
        body: `Hi ${first},\n\nWe’re ready for the next step on your loan — we just need a few items from you:\n\n${list}\n\nA clear phone photo of each works great. Reply here or upload anytime and we’ll take it from there.\n\nThank you,\n${officer?.name ?? 'MS Lending'}\nMS Lending`,
      }
    }
    case 'new-lead-intro':
      return {
        channel: 'sms',
        body: `Hi ${first}, this is ${off} at MS Lending following up on your inquiry. I’d love to walk you through your options and get you pre-qualified — when’s a good time to chat?`,
      }
    case 'send-preapproval':
      return {
        channel: 'email',
        subject: `You’re pre-approved with MS Lending 🎉`,
        body: `Hi ${first},\n\nGreat news — you’re pre-approved${b.amount ? ` for up to ${money(b.amount)}` : ''}! Your pre-approval letter is attached/available, and you’re ready to make offers with confidence.\n\nLet me know the moment you find a home you love and we’ll move fast.\n\nCongratulations,\n${officer?.name ?? 'MS Lending'}\nMS Lending`,
      }
    case 'stuck':
      return {
        channel: 'sms',
        body: `Hi ${first}, ${off} with MS Lending — checking in to make sure nothing’s stuck on your loan. ${step ? step.charAt(0).toUpperCase() + step.slice(1) + '.' : ''} Reach out anytime!`,
      }
    case 'rate-lock':
      return {
        channel: 'sms',
        body: `Hi ${first}, ${off} at MS Lending — your rate lock is coming up. Let’s make sure we close in time so you keep your ${b.rate}% rate. Anything you need from me to keep things moving?`,
      }
    case 'post-close-checkin':
      return {
        channel: 'email',
        subject: 'Welcome home — and a place to keep your documents',
        body: `Hi ${first},\n\nCongratulations again from all of us at MS Lending! One thing worth knowing: your borrower portal stays open after closing. You can keep your closing documents, homeowners insurance, even your will and estate paperwork in your secure vault — and share any of it with family or your attorney whenever you need.\n\nWe’re always one call away,\n${officer?.name ?? 'MS Lending'}\nMS Lending`,
      }
    case 'refi-watch':
      return {
        channel: 'email',
        subject: 'Worth a quick look at your rate?',
        body: `Hi ${first},\n\nYou closed your loan at ${b.rate}%, and rates have been moving. A refinance might lower your monthly payment — it only takes me a few minutes to run the numbers, with no obligation at all.\n\nWant me to take a look for you?\n\n${officer?.name ?? 'MS Lending'}\nMS Lending`,
      }
    case 'review-request':
      return {
        channel: 'email',
        subject: 'It was a joy working with you',
        body: `Hi ${first},\n\nHelping you get home was the best part of our month. If you have a minute, a quick review means the world to a small Mississippi team like ours — and if anyone you know is thinking about buying or refinancing, we’d love to take great care of them too.\n\nWith gratitude,\n${officer?.name ?? 'MS Lending'}\nMS Lending`,
      }
    case 'nurture-checkin':
      return {
        channel: 'sms',
        body: `Hi ${first}, ${off} at MS Lending just thinking of you. No rush at all — whenever the timing feels right to look at buying again, I’m here and happy to pick up right where we left off.`,
      }
    default:
      return { channel: 'sms', body: `Hi ${first}, checking in on your loan — ${off} at MS Lending.` }
  }
}

/* one prioritized rule per loan (first match wins). Every rule only ever
   *drafts* — nothing is sent until a human reviews it on the Autopilot page. */
const RULES = [
  { kind: 'referral-callback', priority: 1, label: 'Call back referral', match: (b) => b.viaReferral && b.status === 'New Lead', why: (b) => `Referral${b.agentId && agentById(b.agentId) ? ` from ${agentById(b.agentId).name.split(' ')[0]}` : ''} — speed wins these` },
  { kind: 'overdue-followup', priority: 1, label: 'Overdue follow-up', match: (b) => isOverdue(b), why: (b) => `Follow-up ${-daysUntil(b.nextFollowUp)}d overdue` },
  { kind: 'rate-lock', priority: 1, label: 'Protect the rate lock', match: (b) => b.rateLockExpires && daysUntil(b.rateLockExpires) >= 0 && daysUntil(b.rateLockExpires) <= 7, why: (b) => `Rate lock expires in ${daysUntil(b.rateLockExpires)}d` },
  { kind: 'closing-soon', priority: 2, label: 'Confirm closing', match: (b) => b.estClosing && daysUntil(b.estClosing) >= 0 && daysUntil(b.estClosing) <= 7, why: (b) => `Closes ${fmtDateFull(b.estClosing)}` },
  { kind: 'doc-request', priority: 2, label: 'Request documents', match: (b) => b.status === 'Documents Needed' && missingDocs(b).length > 0, why: (b) => `${missingDocs(b).length} document${missingDocs(b).length > 1 ? 's' : ''} outstanding` },
  { kind: 'new-lead-intro', priority: 2, label: 'Intro a new lead', match: (b) => b.status === 'New Lead', why: () => 'New lead — make first contact' },
  { kind: 'send-preapproval', priority: 3, label: 'Send pre-approval', match: (b) => b.status === 'Pre-Approved', why: () => 'Pre-approved — get them shopping' },
  { kind: 'stuck', priority: 3, label: 'Unstick a file', match: (b) => isStuck(b), why: (b) => `${daysInStage(b)} days in ${b.status}` },
]

/* automations that keep working after the loan is done — the portal stays
   alive, so these nurture the relationship (still review-then-send). */
const CLOSED_RULES = [
  { kind: 'post-close-checkin', priority: 2, label: 'Post-close check-in', match: (b) => b.status === 'Closed' && b.estClosing && daysUntil(b.estClosing) >= -21, why: () => 'Just closed — welcome them & open the vault' },
  { kind: 'nurture-checkin', priority: 3, label: 'Nurture a paused file', match: (b) => b.status === 'Lost', why: () => 'Paused — keep the door open for later' },
  { kind: 'refi-watch', priority: 3, label: 'Refi opportunity', match: (b) => b.status === 'Closed' && b.rate >= 6.4, why: (b) => `Closed at ${b.rate}% — worth a refi look` },
  { kind: 'review-request', priority: 3, label: 'Ask for a review', match: (b) => b.status === 'Closed', why: () => 'Happy client — ask for a review & referral' },
]

export function buildSuggestions(borrowers, seat, handled = {}) {
  const mine = seat === 'team' ? borrowers : borrowers.filter((b) => b.officerId === seat)
  const out = []
  for (const b of mine) {
    const rule = (isClosedOut(b) ? CLOSED_RULES : RULES).find((r) => r.match(b))
    if (!rule) continue
    const key = `${b.id}:${rule.kind}`
    // skip anything acted on / snoozed whose suppression window hasn't passed
    if (handled[key] && daysUntil(handled[key]) >= 0) continue
    const officer = officerById(b.officerId)
    const draft = draftFor(rule.kind, b, officer)
    out.push({
      key,
      borrowerId: b.id,
      name: b.name,
      status: b.status,
      kind: rule.kind,
      label: rule.label,
      priority: rule.priority,
      why: rule.why(b),
      channel: draft.channel,
      subject: draft.subject ?? '',
      body: draft.body,
      docRequest: rule.kind === 'doc-request',
    })
  }
  return out.sort((a, z) => a.priority - z.priority)
}
