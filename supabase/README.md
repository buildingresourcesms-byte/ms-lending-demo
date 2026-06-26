# Supabase backend — the secure data layer

This is the persistence + auth + file storage that unblocks real borrower
data. It enforces access **at the database** via Row-Level Security, so the
browser only ever holds the public anon key. Pairs with [`../COMPLIANCE.md`](../COMPLIANCE.md).

## What's here

| File | Purpose |
|---|---|
| `migrations/0001_schema.sql` | Tables mirroring `src/data.js` (borrowers, docs, tasks, messages, templates, shares, chat, vault). SSN/DOB stored as encrypted `bytea` only. |
| `migrations/0002_security.sql` | RLS for three identities — **staff**, portal **owner** (borrower), portal **invitee** (scoped by the same `perms` as the app). Column protection via security-definer views. |
| `migrations/0003_audit.sql` | Append-only `audit_log` + write triggers on every NPI table (Safeguards 314.4(c)(8)). |
| `migrations/0004_storage.sql` | Private `documents` and `vault` buckets; access gated by the same staff/owner/invitee rules. Downloads via short-lived signed URLs only. |

## Provision (one time)

1. Create a Supabase project on a **paid tier** (free tier carries no DPA — see COMPLIANCE.md §4). Pick a **US region**.
2. Sign the **DPA / security addendum** in the dashboard.
3. Apply the schema:
   ```bash
   supabase link --project-ref <ref>
   supabase db push          # applies migrations/*.sql in order
   ```
   (or paste each file into the SQL editor, in numeric order.)
4. **Auth → Providers:** enable Email; turn **off** public sign-ups (staff are invited).
5. **Auth → MFA:** enable **TOTP**, and set the app to require **AAL2** before showing borrower data (`assuranceLevel()` in `src/db/supabase.js`).
6. **Storage:** confirm `documents` and `vault` buckets exist and are **private**.
7. Put the keys in your env (see `../.env.example`):
   - `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (browser)
   - `SUPABASE_SERVICE_ROLE_KEY` (server only — never shipped)

## Identities & access (how RLS maps to the app)

- **Staff** = a row in `profiles` (`id == auth.users.id`). Sees the full team pipeline; the only identity that can touch the `borrowers` base table (which holds `ssn_enc`/`dob_enc`).
- **Owner** = a portal login whose email matches `borrowers.email`. Sees their own file's safe columns (via the `portal_borrower` view), manages their `portal_shares`, posts to chat, manages their vault.
- **Invitee** = a login listed in `portal_shares`, limited to the sections their `perms` allow — identical to the in-app "who sees what" checklist.

## Still server-side, not in this repo yet

- **SSN/DOB envelope encryption:** do it in a Vercel/Edge function using a KMS key (`PII_KMS_KEY_ID`) *before* insert. Never encrypt in the browser, never with the anon key.
- **Read auditing:** enable the `pgaudit` extension to log SELECTs (triggers only capture writes).
- **Retention/deletion jobs:** schedule purges per policy; wire a delete path for borrower requests.

## Then: swap the app off localStorage

`src/store.jsx` is the only place that persists data. Once the project is live,
port its mutations (borrowers, templates, shares, chat, vault) to the helpers in
`src/db/supabase.js`. Because it's one file, this is a contained swap — and it's
done *after* provisioning so each change is verified against the real database.
