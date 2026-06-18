# Real two-way email — backend setup

This turns the workspace into a **real product**: it reads Julene's actual inbox and sends
real email, in-thread. The static demo on GitHub Pages keeps working untouched — this is
the *live* deployment on Vercel: **https://ms-lending-demo.vercel.app**

`julene@mslending.net` runs on **Microsoft 365** (via GoDaddy, with Proofpoint filtering
inbound mail), so the **Outlook / Microsoft 365** path below is the one to follow. A Gmail
path is also built in (see the bottom) if you ever want to connect a Google account too.

I (Claude) wrote all the code. The steps below are the parts only **you** can do, because
they touch your own accounts — same as the one-time GitHub login you did earlier. When you
finish, ping me and we verify a real send + a real reply landing in the app, together.

---

## What's already built (in this repo)

```
api/
  _mslib.js              shared Microsoft Graph helpers
  outlook/auth.js        starts Microsoft sign-in
  outlook/callback.js    finishes sign-in, shows your refresh token
  outlook/messages.js    reads recent inbox + sent mail
  outlook/send.js        sends real email (in-thread replies)
  _lib.js, gmail/*       the same thing for Gmail (optional)
  health.js              status probe (tells the app which inbox is live)
vercel.json              build config
src/api.js               the app's client (auto-routes to Outlook or Gmail)
```

No new dependencies — plain `fetch` against the Microsoft Graph API.

> ⚠️ **One thing to know up front (so it doesn't surprise you):** Microsoft 365 usually
> requires an **admin** to approve a new app once before a regular user can connect it.
> The admin/owner of `mslending.net` (likely **Michelle Dugan**) may need to click one
> "Grant admin consent" button. I'll give you the exact thing to send her if you hit that
> screen. Everything else you can do yourself.

---

## ✅ Already done
- [x] **App deployed to Vercel** → https://ms-lending-demo.vercel.app

So we start at the Microsoft step.

---

## Outlook / Microsoft 365 setup

### 1. Sign in to the Microsoft admin portal — *with the right account*
Go directly to **https://entra.microsoft.com**.

⚠️ Sign in with the **Microsoft 365 work account** — Julene's `…@mslending.net` email +
its email password. **Not** the GoDaddy.com login. (GoDaddy hides this portal, so you have
to go to the Microsoft URL directly. This is the #1 thing people get stuck on.)

### 2. Register the app
1. Left menu → **Applications → App registrations → + New registration**.
2. Name: `MS Lending Workspace`.
3. Supported account types: **Accounts in this organizational directory only (single tenant)**.
4. Click **Register**.
5. On the app's **Overview** page, copy two values:
   - **Application (client) ID**
   - **Directory (tenant) ID**

### 3. Add the redirect URL
1. Left menu (within the app) → **Authentication → + Add a platform → Web**.
2. Redirect URI — paste exactly:
   ```
   https://ms-lending-demo.vercel.app/api/outlook/callback
   ```
3. **Configure / Save.**

### 4. Create a client secret
1. **Certificates & secrets → + New client secret** → Add.
2. **Copy the secret's "Value" immediately** (it's only shown once — not the "Secret ID").

### 5. Add the mailbox permissions
1. **API permissions → + Add a permission → Microsoft Graph → Delegated permissions**.
2. Add these four (search each, tick it): `Mail.Read`, `Mail.Send`, `offline_access`, `User.Read`.
   - **Delegated**, not Application. (Delegated = just Julene's mailbox.)
3. If you (or the owner) have admin rights, click **"Grant admin consent for …"** now — that
   avoids the approval wall later. If you can't, that's fine — see the note in step 7.

### 6. Add the secrets to Vercel
In the Vercel project → **Settings → Environment Variables**, add:

| Name                    | Value                                                    |
|-------------------------|----------------------------------------------------------|
| `OUTLOOK_CLIENT_ID`     | Application (client) ID (step 2)                         |
| `OUTLOOK_CLIENT_SECRET` | the secret **Value** (step 4)                           |
| `OUTLOOK_TENANT`        | Directory (tenant) ID (step 2) — or `mslending.net`     |
| `OUTLOOK_REDIRECT_URI`  | `https://ms-lending-demo.vercel.app/api/outlook/callback` |

Then **Deployments → … → Redeploy** so they take effect.

### 7. Authorize the mailbox (one sign-in)
1. Visit **https://ms-lending-demo.vercel.app/api/outlook/auth**.
2. Sign in as Julene and approve.
   - **If you see "Need admin approval"** → that's the admin-consent wall. The account owner
     (Michelle) needs to approve it once. Easiest: send her this link to click & approve —
     I'll generate the exact URL for you once your Client ID is set (it looks like
     `https://login.microsoftonline.com/<tenant>/adminconsent?client_id=<your-client-id>`).
     After she approves once, redo this step and it'll go through.
3. The page shows a **refresh token**. Copy it.
4. In Vercel → add one more env var, then **Redeploy**:

   | Name                     | Value         |
   |--------------------------|---------------|
   | `OUTLOOK_REFRESH_TOKEN`  | (the token)   |

### 8. Confirm it's live
Visit **https://ms-lending-demo.vercel.app/api/health** — you should see:

```json
{ "ok": true, "outlookConfigured": true, "gmailConfigured": false, "provider": "outlook" }
```

When `provider` is `"outlook"`, **ping me.** That's my signal to wire the Inbox to your live
mail and run a real send + real receive test with you watching.

---

## Notes
- Julene's email **password never touches this app.** Microsoft's OAuth holds the keys; the
  app only gets a revocable token. Remove access anytime at
  [myaccount.microsoft.com](https://myaccount.microsoft.com/).
- **Proofpoint / MX:** nothing to change. The app talks to your mailbox directly over Microsoft
  Graph; the inbound mail filter is untouched.
- This is single-user (Julene). Adding more loan officers later means per-user sign-in + a
  small database — a clean next step, not needed now.
- Cost: Vercel free tier and the Graph API free quota cover this use easily.

---

## (Optional) Gmail path
If you ever want to connect a Google account instead/as well, the Gmail functions are built
too. Set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`
(`…/api/gmail/callback`) from a Google Cloud OAuth client (Gmail API enabled), authorize at
`…/api/gmail/auth`, then set `GOOGLE_REFRESH_TOKEN`. The app uses Outlook when both are set.
