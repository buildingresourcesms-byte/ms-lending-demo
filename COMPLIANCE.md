# MS Lending — Security & PII Compliance Posture

**Status: NOT yet cleared for real borrower data.** This document tracks the
technical controls in the software against the **GLBA Safeguards Rule (16 CFR
314.4)** and names the organizational work that code cannot do. Treat the
go-live checklist at the bottom as a hard gate.

> Compliance is **code + program + contracts + audit**. This repo can satisfy
> the *technical* controls. It cannot, by itself, make MS Lending compliant —
> that requires a written program, a designated owner, signed vendor
> agreements, and independent testing. Don't put real NPI in this system until
> every box below is checked.

---

## 1. What data this system handles (classification)

Under GLBA this is **Nonpublic Personal Information (NPI)** the moment real
clients are entered:

| Class | Examples in this app | Sensitivity |
|---|---|---|
| Contact | name, phone, email, address | PII |
| Financial | loan amount, credit score, property value, employer | NPI |
| **Documents** | pay stubs, W-2s, tax returns, bank statements, driver's license | **High — often contains SSN/DOB/account numbers** |
| Relationships | co-borrower, agent, shared-portal invitees | PII |

The intake form deliberately collects **no SSN/credit pull** (it hands off to
the external 1003). The **document vault/uploads are the highest-risk surface** —
they will contain SSNs and account numbers. Treat uploaded files as the crown
jewels.

---

## 2. Technical controls vs. the Safeguards Rule

Legend: ✅ done · 🟡 in repo / needs deploy-config · ⛔ not built yet (gates real PII)

| 314.4 ref | Control | Status | Where |
|---|---|---|---|
| (c)(3) | TLS in transit | ✅ | Vercel HTTPS + HSTS (`vercel.json`) |
| (c)(4) | Secure dev: security headers (CSP, frame-ancestors, nosniff, referrer, permissions-policy) | ✅ | `vercel.json` |
| (c)(4) | No inline scripts; XSS-escaped OAuth pages; timing-safe secret compares; fail-closed integration access; secrets never returned | ✅ | `api/_oauth.js`, `api/_integration-access.js` |
| (c)(1) | Token cookies HttpOnly/Secure/SameSite | ✅ | `api/_oauth.js` |
| (c)(3) | **Encryption at rest** for stored NPI + **field-level encryption** for SSN/DOB/account numbers | ⛔ | needs the data backend (§3) |
| (c)(1) | **Real authentication** (today's sign-in is a demo with no password) + role-based access, least privilege | ⛔ | needs auth provider (§3) |
| (c)(5) | **MFA** for every user accessing customer info | ⛔ | needs auth provider (§3) |
| (c)(8) | **Audit logging** — who viewed/changed which borrower, when | ⛔ | needs the data backend (§3) |
| (c)(6) | **Secure disposal / retention** (≤2 yrs unless needed) + right-to-delete | ⛔ | needs the data backend (§3) |
| (c)(2) | Data + systems inventory | 🟡 | this doc is the start; keep it current |
| (c)(7) | Change management | 🟡 | git + PR review; document the policy |
| (d) | Monitoring / pen test / vuln scans | ⛔ | org task (§4) |

**Bottom line:** transport, headers, and integration-glue hygiene are done.
Everything that protects *stored borrower data* (encryption at rest, real
auth + MFA, audit logs, retention) does not exist yet because there is no data
backend yet. That backend is the build in §3.

---

## 3. Secure data backend (the build that unblocks real PII)

The new features (clients, templates, portal sharing/chat/vault, media)
currently persist in **browser localStorage** — not acceptable for NPI. All
their mutations are isolated in `src/store.jsx`, so the swap to a real backend
is contained. Target design:

- **Postgres with encryption at rest** (managed). Recommended: **Supabase** —
  Postgres + Auth + Storage + Row-Level Security + Realtime in one, which maps
  directly onto our features and minimizes hand-written backend.
- **Row-Level Security** enforces the portal "who-sees-what" permissions at the
  database, not just the UI. (The `shares` permission model already mirrors this.)
- **Field-level (envelope) encryption** for SSN, DOB, and account numbers, keyed
  via a managed KMS — defense in depth beyond at-rest encryption.
- **Auth + MFA**: replace the demo sign-in with real accounts, enforced MFA,
  session expiry, and least-privilege roles (officer / processor / admin).
- **File storage** with private buckets + signed, expiring URLs for the vault and
  document uploads (no more `blob:` object URLs; real, access-controlled storage).
- **Append-only audit log** table (actor, action, record, timestamp, IP) with
  DB triggers on every NPI read/write.
- **Retention + deletion** jobs (purge per policy; honor deletion requests).
- Keep the existing Vercel **integration functions** for OAuth/webhooks/Twilio/mail —
  that layer stays; add the data layer beside it.
- Add the backend's domain(s) to `connect-src` in the `vercel.json` CSP when wired.

---

## 4. Program & contracts (NOT code — required by the Rule)

These are organizational and legal. The software is not compliant without them:

- [ ] **Designate a Qualified Individual** to own the security program — 314.4(a)
- [ ] **Written risk assessment** — 314.4(b)
- [ ] **Written Information Security Program (WISP)** documenting all of 314.4
- [ ] **Signed DPA / vendor security addenda** with every processor that touches
      NPI: hosting (Vercel), database/storage/auth (Supabase or chosen vendor),
      Twilio, email provider, e-sign, etc. — 314.4(f). Use **paid/business tiers**;
      free tiers do not carry these agreements.
- [ ] **Incident response plan**, written and rehearsed — 314.4(g)
- [ ] **Security awareness training** for all staff — 314.4(e)
- [ ] **Annual penetration test + biannual vulnerability scans** (or continuous
      monitoring) — 314.4(d)
- [ ] **Privacy notice** delivered to borrowers (GLBA Privacy Rule)
- [ ] **Annual report** from the Qualified Individual to leadership — 314.4(h)
- [ ] **Cyber liability insurance**
- [ ] Confirm **state (MS) lending/privacy** obligations and any borrower-state
      laws (e.g., CCPA/CPRA) with counsel

---

## 5. Go-live gate — do NOT enter real borrower data until ALL are true

- [ ] Data backend live with **encryption at rest** + **field-level encryption** for SSN/DOB/accounts
- [ ] **Real auth + enforced MFA**; demo sign-in removed
- [ ] **RLS** enforcing portal share permissions at the database
- [ ] **Audit logging** active on every NPI access
- [ ] **Retention + deletion** implemented
- [ ] Document uploads in **private, access-controlled storage** with signed URLs
- [ ] `INTEGRATION_ACTIONS_ENABLED=true` + `INTEGRATION_ALLOWED_ORIGIN` set; secrets in env, not code
- [ ] CSP validated on a Vercel preview; backend domains added to `connect-src`
- [ ] WISP, Qualified Individual, signed DPAs, IR plan, training, pen test (§4) complete
- [ ] Independent review / pen test passed

Until then the app stays in **demo mode with fictional data**, as the in-app
disclaimers state.
