# ▶ Continue here (resume on another machine)

This file is the handoff. It lives in the repo, so it syncs via OneDrive.
Open it first on the new machine, then keep going.

## 1. Start the project on a new machine

Prereqs: **Node.js 20+** and a terminal. The repo is in OneDrive, so the files
are already synced — but `node_modules` should be rebuilt locally (don't trust
the OneDrive-synced copy).

```bash
cd <your-OneDrive>/claude/ms-lending-demo
npm install        # rebuild node_modules fresh on this machine
npm run dev        # → http://localhost:5173
npm run build      # production build (sanity check)
npm test           # 20 tests should pass
```

> **OneDrive tip:** running a Node dev server inside a OneDrive folder can make
> HMR slow or flaky because OneDrive keeps syncing `node_modules`. If it acts
> up, pause OneDrive sync while you work, or (better) clone the repo to a local
> folder outside OneDrive for development.

## 2. Where we are right now

- App = React 19 + Vite loan CRM. Demo data is in **localStorage**; it still
  runs fully offline.
- **Supabase backend chosen and scaffolded.** A free project is connected:
  - `.env.local` holds `VITE_SUPABASE_URL` + the publishable key (syncs via
    OneDrive; gitignored so it won't be committed). If it's missing on the new
    machine, recreate it from the values in your Supabase dashboard → Settings → API.
  - Migrations **applied** to the project: `supabase/migrations/0001..0004` (run
    via `supabase/apply_all.sql`). Tables exist; RLS verified (anon reads blocked).
  - The app is **still in demo mode** — nothing imports `src/db/supabase.js` yet,
    so behavior is unchanged and you can't get locked out.

## 3. Next steps (in order)

1. **Create your staff login** (if not done): dashboard → Authentication → Users →
   Add user (email + password, check *Auto Confirm*). Then run
   `supabase/make_staff.sql` (edit the email first). The `select` should return 1 row.
2. **Wire real sign-in:** add Supabase email/password auth to the Landing page
   (keep the demo as fallback so you're never locked out).
3. **Port `src/store.jsx`** off localStorage to `src/db/supabase.js`, verified
   against the live DB — sign in as staff vs. an invitee to prove the share
   permissions hold.
4. **Server-side SSN/DOB encryption** (Vercel/Edge function + KMS) — paid-tier,
   pre-production.

## 4. The hard line (don't skip)

- **Free project = fake/sample data ONLY.** No real borrower PII, SSNs, or
  documents until you're on a **paid tier with a signed DPA**. See `COMPLIANCE.md`.
- Never paste or store the Supabase **service-role** key in the repo or chat —
  dashboard only. The publishable/anon key is fine (it's public by design).

## 5. Map of what's where

| Path | What |
|---|---|
| `COMPLIANCE.md` | GLBA Safeguards control map + go-live gate |
| `vercel.json` | Security headers / CSP (deploy-time) |
| `supabase/migrations/` | Schema, RLS, audit, storage |
| `supabase/apply_all.sql` | All migrations + seed in one paste |
| `supabase/make_staff.sql` | Promote your login to staff |
| `src/db/supabase.js` | Client (auth, MFA, signed file URLs) — env-guarded |
| `src/store.jsx` | The only persistence touchpoint (localStorage → Supabase swap target) |
| `BACKEND-SETUP.md` | Integration (`api/`) connector setup |

## 6. Resume with Claude on the new machine

My session memory is stored on *this* machine, not in the repo — so on the new
machine, start a fresh Claude session **in this project folder** and point it
here:

> "Read CONTINUE_HERE.md and pick up from step 3 — wire Supabase sign-in and
> port the store. The free Supabase project is connected and migrations are applied."

To let Claude drive your Supabase dashboard, install the **Claude for Chrome**
extension on that machine and connect it (Chrome Web Store → "Claude for Chrome").
