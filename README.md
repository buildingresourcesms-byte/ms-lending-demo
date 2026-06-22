# MS Lending — Loan Workspace

A SaaS-style loan workspace for MS Lending, LLC (Madison, MS): leads, borrowers, loan files,
documents, tasks, follow-ups, agent partners, and borrower communication — in one place.

It runs two ways from the same codebase:

- **Static demo** (GitHub Pages) — fully self-contained, fictional sample data, no backend.
- **Local/Vercel runtime** — serves a complete connector API for every integration card,
  including OAuth, API-key actions, signed webhooks, and honest configuration status. See
  [`BACKEND-SETUP.md`](BACKEND-SETUP.md).

> **Demo prototype. Sample data is fictional. Not intended for real borrower data or
> compliance use** until the production hardening pass.

## Run it

```bash
npm install
npm run dev      # → http://localhost:5173
npm run build    # static bundle → dist/
```

The app gates behind a demo **sign-in** (pick a loan officer or "whole team"). Your data
(borrowers, tasks, messages, connections, prefs) **persists in localStorage** and survives
reloads; Settings → *Reset demo data* clears it.

## What's inside

**Team workspace**
- **Dashboard** — day-at-a-glance, scoped to the signed-in officer or the whole team: KPIs,
  pipeline chart, today's tasks, overdue/stuck/rate-lock alerts, activity feed.
- **Autopilot** — a human-review queue that drafts the next best action for each file.
- **Calendar** — month grid + week strip of closings, follow-ups, and task due dates
  (drag to reschedule).
- **Agent Partners** — the referral network: partner tiers, two-way reciprocity ledger,
  live buyer tracking, QR/pre-approval kit, and **Partner Link** to the separate AgentHQ app.
- **Borrowers** — full CRM: search, filters (officer/status/loan type/overdue/missing
  docs/stuck), per-file "next action," bulk email/text, CSV export.
- **Loan file** — Overview, Borrower Info, Loan Details, Documents, Tasks, Notes, Timeline.
- **Inbox** — two-way borrower messaging (SMS/email threads).
- **Live Mail** — real connected mailbox view (Outlook/Gmail) on the Vercel deployment.
- **Tasks** — drag-and-drop board (To Do / In Progress / Waiting / Complete).
- **Reports** — pipeline, volume, and source analytics.

**Client-facing**
- **Borrower Portal** — friendly progress tracker, document upload prompts, officer card.
- **Apply Intake** — a public apply link that captures new leads straight into the pipeline.

**System** — Integrations (16 server adapters with configuration and connection status), Settings (company profile, team,
themes, notification prefs), Profile, and a ⌘K command palette.

## Stack

- React 19 + Vite, Tailwind CSS v4 (navy / blue / teal / sage, Inter), lucide-react.
- Selectable themes + dark mode; confetti on closings.
- Client mock data in `src/data.js`; state persisted to localStorage.
- **Integrations:** serverless functions in `api/` provide Microsoft/Gmail mail, OAuth
  connectors, Twilio communication actions, provider actions, signed webhooks, and a common
  event-delivery boundary. Vite runs the same handlers locally.

## Deploy

- **GitHub Pages:** built static site lives in `docs/` (rebuild with
  `npm run build` then copy `dist/` → `docs/`).
- **Vercel:** `vercel.json` builds the Vite app and serves the `api/` functions; this is the
  deployment that does real email. Setup steps in [`BACKEND-SETUP.md`](BACKEND-SETUP.md).

The workspace is team-neutral — any officer signs in and sees their own (or the team's)
pipeline; per-file officer assignment carries the "who owns this" context.
