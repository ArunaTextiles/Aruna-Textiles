import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { linkFromUrl, verifyEmailLink, setNewPassword, signOut } from '../lib/auth'
import { hasSupabase } from '../lib/supabase'

type Stage = 'checking' | 'set' | 'done' | 'error'

// Lands from the "Reset your password" email: /account/reset?token_hash=…&type=recovery
// Verifies the link, then lets the user choose a new password (Supabase's recovery flow).
export default function ResetPassword() {
  const [stage, setStage] = useState<Stage>('checking')
  const [msg, setMsg] = useState('')
  const [pw, setPw] = useState({ password: '', confirm: '' })
  const [busy, setBusy] = useState(false)
  const ran = useRef(false)

  useEffect(() => {
    if (!hasSupabase || ran.current) return
    ran.current = true
    const link = linkFromUrl()
    if (link.tokenHash && link.type === 'recovery') {
      verifyEmailLink(link.tokenHash, link.type)
        .then(() => setStage('set'))
        .catch((e) => { setMsg(e instanceof Error ? e.message : 'This reset link has expired or was already used. Please request a new one.'); setStage('error') })
    } else if (link.errorCode) {
      setMsg(link.errorCode === 'otp_expired' ? 'This reset link has expired or was already used. Please request a new one.' : (link.errorText || 'This reset link is no longer valid.'))
      setStage('error')
    } else {
      setMsg('No reset link found on this page. Please use the link from your email, or request a new one.')
      setStage('error')
    }
  }, [])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (pw.password.length < 8) return setMsg('Use at least 8 characters.')
    if (!/[A-Za-z]/.test(pw.password) || !/\d/.test(pw.password)) return setMsg('Use both letters and numbers.')
    if (pw.password !== pw.confirm) return setMsg('The two passwords don’t match.')
    setBusy(true); setMsg('')
    try {
      await setNewPassword(pw.password)
      setStage('done')
      signOut().catch(() => {})
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Could not set the new password just now. Try again.')
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
      {stage === 'error' && (
        <div className="auth-card" style={{ textAlign: 'center', padding: '40px 32px' }}>
          <h2 className="auth-title">Link not usable</h2>
          <p className="auth-intro">{msg}</p>
          <Link to="/account" className="auth-submit" style={{ display: 'inline-flex', width: 'auto', padding: '0 22px', marginTop: 8 }}>Back to sign in</Link>
        </div>
      )}
    </div></div>
  )
}
