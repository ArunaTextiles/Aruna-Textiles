import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import {
  passwordProblem,
  resendConfirmation,
  sendCode,
  sendPasswordReset,
  signInWithPassword,
  signUp,
  verifyCode,
} from '../lib/auth'

type Mode = 'signin' | 'signup' | 'forgot' | 'code' | 'code-verify' | 'sent'

const Arrow = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
)

// Polished sign-in / sign-up card (21st.dev-style): centred, soft card, quiet type,
// one clear primary action. Handles email + password, create account, forgot, OTP code,
// and magic-link confirmation. Supabase Auth issues the JWT the checkout API verifies.
export default function SignIn({
  title = 'Welcome to Aruna',
  intro = 'Sign in or create an account to check out, save your bag and follow your orders.',
  onDone,
  initialMode = 'signin',
}: {
  title?: string
  intro?: string
  onDone?: (user: { id: string; email?: string } | null) => void
  initialMode?: Mode
}) {
  const { setUser, ensure } = useAuth()
  const [mode, setMode] = useState<Mode>(initialMode)
  const [f, setF] = useState({ name: '', email: '', password: '', confirm: '', code: '' })
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [cooldown, setCooldown] = useState(0)

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setF((x) => ({ ...x, [k]: k === 'code' ? e.target.value.replace(/\D/g, '') : e.target.value }))

  useEffect(() => { ensure() }, [ensure])
  useEffect(() => {
    if (!cooldown) return
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000)
    return () => clearTimeout(t)
  }, [cooldown])

  const go = (m: Mode) => { setMode(m); setError(''); setNotice('') }
  const emailOk = () => /^\S+@\S+\.\S+$/.test(f.email.trim())
  const attempt = async (fn: () => Promise<unknown>) => {
    setError('')
    setBusy(true)
    try { await fn() } catch (e) { setError(e instanceof Error ? e.message : 'Something went wrong.') } finally { setBusy(false) }
  }
  const done = (u: { id: string; email?: string } | null) => {
    if (!u) { setUser(null); onDone?.(null); return }
    setUser({ id: u.id, email: u.email || '', name: (u as { user_metadata?: { full_name?: string } }).user_metadata?.full_name })
    onDone?.(u)
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (mode !== 'code-verify' && !emailOk()) return setError('Please enter a valid email address.')
    if (mode === 'signin') {
      if (!f.password) return setError('Enter your password.')
      return attempt(async () => {
        try {
          done(await signInWithPassword(f.email, f.password))
        } catch (err) {
          const m = err instanceof Error ? err.message : ''
          if (m.startsWith('We couldn’t sign you in')) {
            // No matching account / password (Supabase never says which): hand off to sign-up
            // carrying over email + password — Kridhya pattern: the user only adds their name.
            go('signup')
            setF((x) => ({ ...x, confirm: '' }))
            setNotice(`We couldn’t sign in with ${f.email.trim()} — no account yet, or the password doesn’t match. If you’re new here, we’ve carried over your email and password: just add your name to create the account.`)
            return
          }
          if (m.startsWith('Please confirm your email')) throw err // handled below by the resend button
          throw err
        }
      })
    }
    if (mode === 'signup') {
      if (!f.name.trim()) return setError('Please enter your name.')
      const p = passwordProblem(f.password)
      if (p) return setError(p)
      if (f.password !== f.confirm) return setError('The two passwords don’t match.')
      return attempt(async () => {
        try {
          const r = await signUp({ name: f.name, email: f.email, password: f.password })
          if (r.user) return done(r.user)
          setMode('sent')
          setNotice(`We’ve sent a confirmation link to ${f.email.trim()}. Open it — you’ll land right back on this page and be signed in automatically.`)
          setCooldown(60)
        } catch (e) {
          const m = e instanceof Error ? e.message : ''
          if (m.startsWith('An account with this email')) {
            // already registered: keep the email + password they just typed, offer sign-in instead
            go('signin')
            setNotice('This email is already registered with Aruna. Sign in with your password below instead.')
            return
          }
          throw e
        }
      })
    }
    if (mode === 'forgot') {
      return attempt(async () => {
        await sendPasswordReset(f.email)
        setMode('sent')
        setNotice(`If an account exists for ${f.email.trim()}, we’ve emailed a link to set a new password.`)
        setCooldown(60)
      })
    }
    if (mode === 'code') {
      return attempt(async () => {
        await sendCode(f.email)
        setMode('code-verify')
        setCooldown(60)
      })
    }
    if (mode === 'code-verify') {
      if (!/^\d{6,8}$/.test(f.code)) return setError('Enter the code from the email.')
      return attempt(async () => done(await verifyCode(f.email, f.code)))
    }
  }

  const strength = (() => {
    const p = f.password
    let n = 0
    if (p.length >= 8) n++
    if (p.length >= 12) n++
    if (/[A-Z]/.test(p) && /[a-z]/.test(p)) n++
    if (/\d/.test(p)) n++
    if (p && !/^[A-Za-z0-9]/.test(p)) n++
    return n
  })()

  const heading: Record<Mode, string> = {
    signin: title,
    signup: 'Create your account',
    forgot: 'Reset your password',
    code: 'Sign in with a code',
    'code-verify': 'Check your email',
    sent: 'Check your email',
  }

  const fieldLabel = 'sr-block'

  return (
    <div className="auth-card">
      <div className="auth-head">
        <img src="/images/brand/aruna-logo-clear.png" alt="Aruna Textile" className="auth-logo" />
        <h2 className="auth-title">{heading[mode]}</h2>

        {(mode === 'signin' || mode === 'signup') && (
          <div className="auth-tabs" role="tablist" aria-label="Sign in or create account">
            {([['signin', 'Sign in'], ['signup', 'Create account']] as const).map(([m, l]) => (
              <button key={m} type="button" role="tab" aria-selected={mode === m} onClick={() => go(m)} className={mode === m ? 'on' : ''}>
                {l}
              </button>
            ))}
          </div>
        )}
        {mode === 'signin' && <p className="auth-intro">{intro}</p>}
        {mode === 'signin' && notice && <p role="status" className="auth-sent" style={{ marginTop: 12 }}>{notice}</p>}
        {mode === 'signup' && notice && <p role="status" className="auth-sent" style={{ marginTop: 12 }}>{notice}</p>}
        {mode === 'forgot' && <p className="auth-intro">Enter your email and we’ll send a link to choose a new password.</p>}
        {mode === 'code' && <p className="auth-intro">We’ll email you a 6-digit code — no password needed.</p>}
        {mode === 'code-verify' && <p className="auth-intro">We sent a code to <strong>{f.email}</strong>. Enter it below, or open the link in the email.</p>}
        {mode === 'sent' && <p role="status" className="auth-sent">{notice}</p>}
      </div>

      {mode !== 'sent' && (
        <form onSubmit={submit} noValidate className="auth-form">
          {mode === 'signup' && (
            <label className="auth-field"><span className={fieldLabel}>Full name</span>
              <input autoComplete="name" value={f.name} onChange={set('name')} placeholder="Your name" /></label>
          )}
          {mode !== 'code-verify' && (
            <label className="auth-field"><span className={fieldLabel}>Email</span>
              <input type="email" autoComplete="email" autoFocus value={f.email} onChange={set('email')} placeholder="you@example.com" /></label>
          )}
          {(mode === 'signin' || mode === 'signup') && (
            <label className="auth-field">
              <span className={fieldLabel}>Password</span>
              <span className="auth-pw">
                <input type={show ? 'text' : 'password'} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} value={f.password} onChange={set('password')} />
                <button type="button" onClick={() => setShow((s) => !s)} className="auth-pw-toggle" aria-label={show ? 'Hide password' : 'Show password'}>{show ? 'Hide' : 'Show'}</button>
              </span>
              {mode === 'signup' && f.password && (
                <span className="auth-strength" aria-hidden="true">
                  {[0, 1, 2, 3, 4].map((i) => <span key={i} className={i < strength ? (strength >= 4 ? 'good' : strength >= 3 ? 'ok' : 'low') : ''} />)}
                </span>
              )}
            </label>
          )}
          {mode === 'signup' && (
            <label className="auth-field"><span className={fieldLabel}>Confirm password</span>
              <input type={show ? 'text' : 'password'} autoComplete="new-password" value={f.confirm} onChange={set('confirm')} /></label>
          )}
          {mode === 'code-verify' && (
            <label className="auth-field"><span className={fieldLabel}>6-digit code</span>
              <input inputMode="numeric" autoComplete="one-time-code" autoFocus maxLength={8} value={f.code} onChange={set('code')} placeholder="••••••" className="auth-code" /></label>
          )}

          {error && <p role="alert" className="auth-error">{error}</p>}

          {error.startsWith('Please confirm your email') && (
            <button type="button" disabled={busy || cooldown > 0}
              onClick={() => attempt(async () => { await resendConfirmation(f.email); setNotice('Confirmation email sent again.'); setCooldown(60) })} className="auth-link">
              {cooldown ? `Send again in ${cooldown}s` : 'Send the confirmation email again'}
            </button>
          )}

          <button type="submit" disabled={busy} className="auth-submit">
            {busy ? <><span className="auth-spinner" aria-hidden="true" /> Please wait…</> :
              <span>{[{ signin: 'Sign in', signup: 'Create account', forgot: 'Email me a reset link', code: 'Email me a code', 'code-verify': 'Sign in' } as const][mode]} <Arrow /></span>}
          </button>

          <div className="auth-switch">
            {mode === 'signin' && <button type="button" className="auth-link" onClick={() => go('forgot')}>Forgot password?</button>}
            {(mode === 'signin' || mode === 'signup') && <button type="button" className="auth-link" onClick={() => go('code')}>Email me a sign-in code instead</button>}
            {['forgot', 'code'].includes(mode) && <button type="button" className="auth-link" onClick={() => go('signin')}>Back to sign in</button>}
            {mode === 'code-verify' && (
              <>
                <button type="button" className="auth-link" onClick={() => go('code')}>Use a different email</button>
                <button type="button" disabled={cooldown > 0 || busy}
                  onClick={() => attempt(async () => { await sendCode(f.email); setCooldown(60) })} className="auth-link">
                  {cooldown ? `Send again in ${cooldown}s` : 'Send a new code'}
                </button>
              </>
            )}
          </div>
        </form>
      )}
      {mode === 'sent' && (
        <button type="button" onClick={() => go('signin')} className="auth-submit ghost">Back to sign in</button>
      )}
      <p className="auth-foot">Your account keeps your bag on every device, remembers your delivery details and lets you follow and pay for your orders.</p>
    </div>
  )
}
