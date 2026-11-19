import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { hasSupabase } from '../lib/supabase'

export default function Account() {
  const { user, loading, signOut, sendOtp, verifyOtp } = useAuth()
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  if (loading) return <div className="page"><div className="wrap acct"><p className="muted">Checking your session…</p></div></div>

  if (user) {
    return (
      <div className="page">
        <div className="wrap acct">
          <span className="kicker">MY ACCOUNT</span>
          <h1>Hello{user.name ? ` ${user.name.split(' ')[0]}` : ''}, you’re signed in as {user.email}.</h1>
          <div className="acct-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <p style={{ fontWeight: 500 }}>Your orders</p>
                <p style={{ color: 'var(--ink-soft)', fontSize: 13 }}>
                  {hasSupabase ? 'Signed in. Order history syncs here once you have placed an order.' : 'Connect your Supabase account in the admin panel to see order history.'}
                </p>
              </div>
              <button className="btn" onClick={() => signOut().catch(() => {})}>Sign out</button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const step1 = async () => {
    setErr(''); setBusy(true)
    try { await sendOtp(email) } catch (e) { setErr(e instanceof Error ? e.message : 'Could not send code.') }
    setBusy(false)
  }
  const step2 = async () => {
    setErr(''); setBusy(true)
    try { await verifyOtp(email, code) } catch (e) { setErr(e instanceof Error ? e.message : 'Wrong or expired code.') }
    setBusy(false)
  }

  return (
    <div className="page">
      <div className="wrap acct">
        <span className="kicker">MY ACCOUNT</span>
        <h1>Sign in</h1>
        <p className="lead" style={{ margin: '14px 0' }}>
          {hasSupabase ? 'Enter your email and we’ll send a one-time code.' : 'Customer sign-in needs your Supabase keys (VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY). Add them in client/.env.local.'}
        </p>
        <div className="acct-otp">
          <input type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <input inputMode="numeric" pattern="\d{6}" placeholder="6-digit code" value={code} onChange={(e) => setCode(e.target.value)} />
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn" onClick={step1} disabled={busy || !email}>Send code</button>
            <button className="btn" style={{ background: 'transparent', color: 'var(--ink)' }} onClick={step2} disabled={busy || code.length < 6}>Verify</button>
          </div>
          {err && <p className="co-err">{err}</p>}
          <p style={{ fontSize: 12, color: 'var(--ink-soft)' }}>New customer? Codes are auto-issued on first use — no password needed. <Link to="/checkout">Go to checkout</Link></p>
        </div>
      </div>
    </div>
  )
}
