# Real two-way email — backend setup

This turns the workspace into a **real product**: it reads your actual Gmail and sends
real email, in-thread. The static demo on GitHub Pages keeps working untouched — this is
a second, *live* deployment on Vercel.

I (Claude) wrote all the code. The steps below are the parts only **you** can do, because
they touch your own accounts — same as the one-time GitHub login you did earlier. Each
takes a few minutes. When you finish, ping me and we verify a real send + a real reply
landing in the app, together.

---

## What's already built (in this repo)

```
api/
  _lib.js              shared Google/Gmail helpers
  health.js            status probe (demo vs. live)
  gmail/auth.js        starts Google sign-in
  gmail/callback.js    finishes sign-in, shows your refresh token
  gmail/messages.js    reads recent inbox + sent mail
  gmail/send.js        sends real email (keeps replies in-thread)
vercel.json            tells Vercel how to build
src/api.js             the app's client for the above
```

No new dependencies. The functions use plain `fetch` against the Gmail API.

---

## Your steps

### 1. Put the app on Vercel (free)
1. Go to **vercel.com** → sign up with your GitHub account.
2. **Add New… → Project → Import** the `ms-lending-demo` repo.
3. Framework preset: **Vite** (it should auto-detect). Click **Deploy**.
4. You'll get a URL like `https://ms-lending-demo-xxxx.vercel.app`. **Copy it** — call it `APP_URL`.

### 2. Make a Google project + Gmail access (free)
1. Go to **console.cloud.google.com** → create a project (e.g. "MS Lending Workspace").
2. **APIs & Services → Library →** search **Gmail API → Enable**.
3. **APIs & Services → OAuth consent screen:**
   - User type: **External** → Create.
   - App name, your email, save through the screens.
   - **Test users → Add** your own Gmail address. (Testing mode = no Google review needed for just you.)
4. **APIs & Services → Credentials → Create credentials → OAuth client ID:**
   - Application type: **Web application**.
   - **Authorized redirect URI:** `APP_URL/api/gmail/callback`
     (e.g. `https://ms-lending-demo-xxxx.vercel.app/api/gmail/callback`)
   - Create → copy the **Client ID** and **Client secret**.

### 3. Add the secrets to Vercel
In your Vercel project → **Settings → Environment Variables**, add:

| Name                   | Value                                  |
|------------------------|----------------------------------------|
| `GOOGLE_CLIENT_ID`     | (from step 2.4)                        |
| `GOOGLE_CLIENT_SECRET` | (from step 2.4)                        |
| `GOOGLE_REDIRECT_URI`  | `APP_URL/api/gmail/callback`           |

Then **Deployments → … → Redeploy** so they take effect.

### 4. Authorize your Gmail (one click)
1. Visit **`APP_URL/api/gmail/auth`** in your browser.
2. Sign in with your Gmail, click **Allow**.
   (You'll see an "unverified app" warning because it's testing mode — that's expected for
   your own single-user app. Click **Advanced → continue**.)
3. The page shows a **refresh token**. Copy it.
4. Back in Vercel → **Settings → Environment Variables**, add:

   | Name                    | Value             |
   |-------------------------|-------------------|
   | `GOOGLE_REFRESH_TOKEN`  | (the token)       |

5. **Redeploy** one more time.

### 5. Confirm it's live
Visit **`APP_URL/api/health`** — you should see:

```json
{ "ok": true, "authConfigured": true, "gmailConfigured": true }
```

When `gmailConfigured` is `true`, **ping me.** That's my signal to wire the Inbox to your
live mail and run a real send + receive test with you watching.

---

## Notes
- Your email **password never touches this app.** Google's OAuth holds the keys; the app
  only gets a revocable token. Remove access anytime at
  [myaccount.google.com/permissions](https://myaccount.google.com/permissions).
- This is single-user (you). Adding more loan officers later means moving from one stored
  token to per-user sign-in + a small database — a clean next step, not needed now.
- Cost: Vercel free tier and the Gmail API free quota cover this use easily.
