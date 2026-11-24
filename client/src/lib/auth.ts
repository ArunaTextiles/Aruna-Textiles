// Customer authentication (email + password, one-time code, magic links) on Supabase Auth.
// @supabase/supabase-js is loaded lazily via lib/supabase so first-time shop visitors stay light.
import { hasSupabase, supabase, hadSession } from './supabase'

// Was someone signed in on this device before? (lets us skip the auth library for new visitors)
export { hadSession }

export async function getUser() {
  if (!hasSupabase) return null
  const sb = supabase()
  const { data } = await sb.auth.getSession()
  return data.session?.user || null
}

// Step 1: email a 6-digit code (and a sign-in link) to the shopper.
export async function sendCode(email: string) {
  const sb = supabase()
  const { error } = await sb.auth.signInWithOtp({
    email: email.trim(),
    options: { shouldCreateUser: true, emailRedirectTo: `${window.location.origin}${window.location.pathname}` },
  })
  if (error) throw new Error(friendly(error.message))
}

// Step 2: check the code they typed.
export async function verifyCode(email: string, code: string) {
  const sb = supabase()
  const { data, error } = await sb.auth.verifyOtp({ email: email.trim(), token: code.trim(), type: 'email' })
  if (error) throw new Error(/expired|invalid/i.test(error.message) ? 'That code is wrong or has expired. Check the latest email, or send a new code.' : error.message)
  return data.user
}

// ── email + password ──
export function passwordProblem(pw: string) {
  if (pw.length < 8) return 'Use at least 8 characters.'
  if (!/[A-Za-z]/.test(pw) || !/\d/.test(pw)) return 'Use both letters and numbers.'
  if (/^(password|12345678|qwerty)/i.test(pw)) return 'That password is too easy to guess.'
  return ''
}

const friendly = (m = '') =>
  /invalid login/i.test(m) ? 'We couldn’t sign you in with that email and password.'
    : /error sending/i.test(m) ? 'We couldn’t send the email just now. Please try again in a few minutes.'
      : /not confirmed/i.test(m) ? 'Please confirm your email first — check your inbox for our link (or send it again below).'
        : /already registered|already exists/i.test(m) ? 'An account with this email already exists. Sign in instead, or reset your password.'
          : /email rate limit/i.test(m) ? 'We’ve sent several emails recently, so sending is paused for a while. Use the newest email you already received, or try again later.'
            : /after (\d+) seconds?/i.test(m) ? `For security, please wait ${/after (\d+) seconds?/.exec(m)![1]} seconds before asking again.`
              : /rate|too many/i.test(m) ? 'Too many attempts — please wait a few minutes and try again.'
                : /weak|pwned|leaked/i.test(m) ? 'Please choose a stronger password — this one appears in known data leaks.'
                  : m

// Where a confirmation/magic link should bring the user back to: the page they were
// on when they signed up (strip the hash so section anchors don't leak into the link).
const currentUrl = () => window.location.href.replace(/[#].*/, '')

export async function signUp({ name, email, password }: { name: string; email: string; password: string }) {
  const sb = supabase()
  const { data, error } = await sb.auth.signUp({
    email: email.trim(),
    password,
    options: { data: { full_name: name.trim() }, emailRedirectTo: currentUrl() },
  })
  if (error) throw new Error(friendly(error.message))
  // email confirmation on: no session until they click the link. (Supabase hides "already registered"
  // for privacy: an existing email returns a user with no identities.)
  if (data.user && !data.user.identities?.length) throw new Error(friendly('already registered'))
  return { user: data.session ? data.user : null, needsConfirmation: !data.session }
}

export async function signInWithPassword(email: string, password: string) {
  const sb = supabase()
  const { data, error } = await sb.auth.signInWithPassword({ email: email.trim(), password })
  if (error) throw new Error(friendly(error.message))
  return data.user
}

export async function resendConfirmation(email: string) {
  const sb = supabase()
  const { error } = await sb.auth.resend({ type: 'signup', email: email.trim(), options: { emailRedirectTo: currentUrl() } })
  if (error) throw new Error(friendly(error.message))
}

export async function sendPasswordReset(email: string) {
  const sb = supabase()
  const { error } = await sb.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/account/reset` })
  if (error) throw new Error(friendly(error.message))
}

export async function setNewPassword(password: string) {
  const sb = supabase()
  const { error } = await sb.auth.updateUser({ password })
  if (error) throw new Error(friendly(error.message))
}

// Email links (reset password, confirm signup, magic link) use ?token_hash=…&type=… — verified here so
// they work in any browser/device, and scanners that pre-open links can't use them (they don't run this).
export function linkFromUrl() {
  const q = new URLSearchParams(window.location.search)
  const h = new URLSearchParams(window.location.hash.replace(/^#/, ''))
  return {
    tokenHash: q.get('token_hash'),
    type: q.get('type'),
    errorCode: q.get('error_code') || h.get('error_code'),
    errorText: q.get('error_description') || h.get('error_description'),
  }
}

export async function verifyEmailLink(tokenHash: string, type: string) {
  const sb = supabase()
  const { data, error } = await sb.auth.verifyOtp({ token_hash: tokenHash, type })
  if (error) throw new Error(/expired|invalid|not found/i.test(error.message) ? 'This link has expired or was already used.' : error.message)
  window.history.replaceState(null, '', window.location.pathname)
  return data.user
}

export async function signOut() {
  const sb = supabase()
  await sb.auth.signOut()
}

export async function accessToken() {
  const sb = supabase()
  const { data } = await sb.auth.getSession()
  return data.session?.access_token || ''
}
