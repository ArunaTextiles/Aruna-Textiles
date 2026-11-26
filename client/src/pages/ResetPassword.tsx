import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { getUser, linkFromUrl, verifyEmailLink, setNewPassword, sendPasswordReset, onPasswordRecovery } from '../lib/auth'
import { hasSupabase } from '../lib/supabase'
import { passwordProblem } from '../lib/auth'

type Stage = 'checking' | 'set' | 'done' | 'expired'

// Lands from the "Reset your password" email: any page with ?token_hash=…&type=recovery (implicit
// flow) or ?code=…&type=recovery (PKCE) is routed here by App.tsx. Verifies the link, then lets
// the user choose a new password. Kridhya pattern: a used/expired link can be replaced on the spot.
export default function ResetPassword() {
  const [stage, setStage] = useState<Stage>('checking')
  const [msg, setMsg] = useState('')
  const [pw, setPw] = useState({ password: '', confirm: '' })
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)
  const ran = useRef(false)

  useEffect(() => {
    if (!hasSupabase || ran.current) return
    ran.current = true

    // PKCE-style recovery link (?code=…): the Supabase client sets up the recovery session on its
    // own via detectSessionInUrl. Watch for the PASSWORD_RECOVERY event and offer the form then.
    const stopRecovery = onPasswordRecovery(() => {
      getUser()
        .then((u) => { if (u?.email) { setEmail(u.email); setStage('set') } })
        .catch(() => { /* the explicit path below still handles it */ })
    })

    const link = linkFromUrl()
    if (link.tokenHash && link.type === 'recovery') {
      verifyEmailLink(link.tokenHash, 'recovery')
        .then((u) => {
          setEmail(u?.email || '')
          setStage('set')
        })
        .catch(() => setStage('expired')) // expired / already used → offer a fresh link
    } else {
      // PKCE link or same-browser link: the recovery session is set up by detectSessionInUrl / the
      // PASSWORD_RECOVERY event above; fall back to reading the session directly.
      getUser()
        .then((u) => {
          if (u?.email) { setEmail(u.email); setStage('set') }
          else setStage('expired') // no link, no session → let them request a fresh one
        })
        .catch(() => setStage('expired'))
    }
    return () => stopRecovery()
  }, [])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const p = passwordProblem(pw.password)
    if (p) return setMsg(p)
    if (pw.password !== pw.confirm) return setMsg('The two passwords don’t match.')
    setBusy(true); setMsg('')
    try {
      await setNewPassword(pw.password)
      setStage('done')
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Could not set the new password just now. Try again.')
    } finally { setBusy(false) }
  }

  // expired link: email the user's address a brand-new reset link (same Supabase flow)
  const resend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setMsg('Please enter a valid email address.')
    setBusy(true); setMsg('')
    try {
      await sendPasswordReset(email)
      setSent(true)
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Could not send a new link just now. Try again.')
    } finally { setBusy(false) }
  }

  return (
    <div className="page store"><div className="wrap" style={{ maxWidth: 560, margin: '40px auto' }}>
      {stage === 'checking' && (
        <div className="auth-card" style={{ textAlign: 'center', padding: '48px 32px' }}>
          <p style={{ color: 'var(--ink-soft)', fontSize: 14 }}>Checking your reset link…</p>
        </div>
      )}
      {stage === 'set' && (
        <div className="auth-card">
          <div className="auth-head">
            <img src="/images/brand/aruna-logo-clear.png" alt="Aruna Textile" className="auth-logo" />
            <h2 className="auth-title">Set a new password</h2>
            <p className="auth-intro">Your link is verified — choose a new password to continue.</p>
          </div>
          {msg && <p role="alert" className="auth-error" style={{ marginTop: 12 }}>{msg}</p>}
          <form onSubmit={submit} noValidate className="auth-form">
            <label className="auth-field"><span className="sr-block">New password</span>
              <input type="password" autoFocus autoComplete="new-password" value={pw.password} onChange={(e) => setPw((x) => ({ ...x, password: e.target.value }))} /></label>
            <label className="auth-field"><span className="sr-block">Confirm password</span>
              <input type="password" autoComplete="new-password" value={pw.confirm} onChange={(e) => setPw((x) => ({ ...x, confirm: e.target.value }))} /></label>
            <button type="submit" className="auth-submit" disabled={busy}>{busy ? 'Saving…' : 'Save new password'}</button>
          </form>
        </div>
      )}
      {stage === 'done' && (
        <div className="auth-card" style={{ textAlign: 'center', padding: '40px 32px' }}>
          <div style={{ width: 56, height: 56, margin: '0 auto 18px', borderRadius: '50%', background: 'var(--green)', display: 'grid', placeItems: 'center', color: '#fff' }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M20 6 9 17l-5-5" /></svg>
          </div>
          <h2 className="auth-title">Password updated</h2>
          <p className="auth-intro">Your password has been changed. Sign in with it to continue where you left off.</p>
          <Link to="/account" className="auth-submit" style={{ display: 'inline-flex', width: 'auto', padding: '0 22px', marginTop: 8 }}>Sign in</Link>
        </div>
      )}
      {stage === 'expired' && (
        <div className="auth-card" style={{ textAlign: 'center', padding: '40px 32px' }}>
          <h2 className="auth-title">Link not usable</h2>
          <p className="auth-intro">Reset links work once and expire after a while — let’s send you a fresh one.</p>
          {sent ? (
            <p role="status" className="auth-sent" style={{ textAlign: 'left', marginTop: 12 }}>
              If an account exists for <strong>{email}</strong>, a new reset link is on its way. Open the newest email.
            </p>
          ) : (
            <form onSubmit={resend} noValidate className="auth-form" style={{ textAlign: 'left' }}>
              <label className="auth-field"><span className="sr-block">Your email</span>
                <input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" /></label>
              {msg && <p role="alert" className="auth-error">{msg}</p>}
              <button type="submit" className="auth-submit" disabled={busy}>{busy ? 'Sending…' : 'Email me a new link'}</button>
            </form>
          )}
          <p style={{ marginTop: 18 }}><Link to="/account" className="auth-link">Back to sign in</Link></p>
        </div>
      )}
    </div></div>
  )
}
