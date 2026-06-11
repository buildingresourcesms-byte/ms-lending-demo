# MS Lending — Loan Workspace (Demo)

A polished SaaS-style **demo prototype** built to show MS Lending, LLC (Madison, MS) how
purpose-built software could organize their day: leads, borrowers, loan files, documents,
tasks, follow-ups, and borrower communication — in one calm, simple place.

> **Demo prototype only. Not intended for real borrower data or compliance use.**
> Every borrower, phone number, and loan amount is fictional sample data.

## Run it

```bash
npm install
npm run dev     # → http://localhost:5173
```

## What's inside

| Page | What it shows |
|---|---|
| **Dashboard** | KPI cards, pipeline-by-stage chart (clickable), lead-source donut, weekly leads sparkline, today's tasks, overdue/stuck alerts, activity feed |
| **Borrowers** | Full CRM — search by name/phone/email/status, filter by officer/status/loan type, overdue & stuck & missing-docs filters, one-click "next action" on every file |
| **Loan file** | 7 tabs: Overview, Borrower Info, Loan Details, Documents, Tasks, Notes, Timeline — with auto-logged activity |
| **Documents** | 9-item checklist per file with 6 statuses, progress bars, and a working "Request Documents" action |
| **Tasks** | 4-column team board (To Do / In Progress / Waiting / Complete) with priorities, due dates, and owners |
| **Borrower Portal** | The client-facing view: friendly 6-stage progress tracker, upload prompts, loan officer card — zero banking jargon |
| **Settings** | Company profile, team, notification preferences, and the compliance disclaimer |

Everything is interactive: advancing a loan's status, requesting documents, uploading from
the portal, adding leads/notes/tasks — all update the dashboard, timeline, and badges live.

## Stack

- React 19 + Vite
- Tailwind CSS v4 (custom navy / blue / teal / sage theme, Inter typeface)
- lucide-react icons
- 100% front-end — local mock data in `src/data.js`, no backend

The workspace is intentionally team-neutral: no single user is baked into the product.
Any team member logs in and sees the shared pipeline; per-file loan officer assignment
carries the "who owns this" context.
