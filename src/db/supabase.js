/* ============================================================
   Supabase client — the real, access-controlled data layer.

   Env-guarded on purpose: with no credentials this exports `null`, the
   app keeps running on its localStorage demo, and `backendConfigured()`
   is false. Set the two VITE_ vars (see .env.example) to switch on the
   real backend. Row-Level Security (supabase/migrations/0002_security.sql)
   enforces who sees what — the browser only ever holds the anon key.
   ============================================================ */
import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase =
  url && anonKey
    ? createClient(url, anonKey, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
      })
    : null

export const backendConfigured = () => supabase != null

/* ---------- auth (replaces the demo sign-in once live) ---------- */
export async function signInWithPassword(email, password) {
  if (!supabase) throw new Error('Backend not configured')
  return supabase.auth.signInWithPassword({ email, password })
}
export async function signOut() {
  return supabase?.auth.signOut()
}
export async function currentSession() {
  if (!supabase) return null
  const { data } = await supabase.auth.getSession()
  return data.session
}

/* ---------- MFA (Safeguards Rule 314.4(c)(5)) ----------
   Enable TOTP in the Supabase dashboard (Auth → MFA), then enroll/verify
   here. Enforce AAL2 (a completed MFA factor) before exposing borrower
   data — gate the app shell on `assuranceLevel() === 'aal2'`. */
export async function enrollTotp() {
  if (!supabase) throw new Error('Backend not configured')
  return supabase.auth.mfa.enroll({ factorType: 'totp' })
}
export async function verifyTotp(factorId, code) {
  if (!supabase) throw new Error('Backend not configured')
  const { data: ch, error } = await supabase.auth.mfa.challenge({ factorId })
  if (error) throw error
  return supabase.auth.mfa.verify({ factorId, challengeId: ch.id, code })
}
export async function assuranceLevel() {
  if (!supabase) return null
  const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
  return data?.currentLevel ?? null // 'aal1' (password) | 'aal2' (password + MFA)
}

/* ---------- private file access (never public URLs) ---------- */
export async function uploadDoc(bucket, borrowerId, file) {
  if (!supabase) throw new Error('Backend not configured')
  const path = `${borrowerId}/${crypto.randomUUID()}-${file.name}`
  const { error } = await supabase.storage.from(bucket).upload(path, file)
  if (error) throw error
  return path
}
export async function signedDownloadUrl(bucket, path, expiresInSeconds = 60) {
  if (!supabase) throw new Error('Backend not configured')
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresInSeconds)
  if (error) throw error
  return data.signedUrl
}

/* NEXT STEP (done once a project is provisioned, so it can be verified
   against the live DB): port the mutations in src/store.jsx from
   localStorage to these calls — borrowers/templates/shares/chat/vault.
   The store is the only place that touches persistence, so this is a
   contained swap, not a rewrite. SSN/DOB stay server-side: encrypt them
   in a Vercel/Edge function with a KMS key before insert — never in the
   browser, never with the anon key. */
