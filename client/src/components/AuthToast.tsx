import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

// Floating "you're signed in" notice, fired when a confirmation/magic link verifies
// (AuthContext dispatches 'aruna:auth-confirmed'). Kridhya-style: shows on the exact
// page the user returned to, then fades away on its own.
export default function AuthToast() {
  const [msg, setMsg] = useState('')

  useEffect(() => {
    const h = (e: Event) => {
      const type = (e as CustomEvent).detail?.type // 'signup' for a just-confirmed email
      setMsg(type === 'signup'
        ? 'Email confirmed — you’re signed in. Your bag and orders are all yours.'
        : 'You’re signed in — welcome back. Your bag and orders are all yours.')
    }
    window.addEventListener('aruna:auth-confirmed', h)
    return () => window.removeEventListener('aruna:auth-confirmed', h)
  }, [])

  useEffect(() => {
    if (!msg) return
    const t = setTimeout(() => setMsg(''), 6000)
    return () => clearTimeout(t)
  }, [msg])

  if (!msg) return null

  return (
    <div className="auth-toast" role="status">
      <span style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--green)', color: '#fff', display: 'inline-grid', placeItems: 'center', flex: '0 0 auto' }}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 6 9 17l-5-5" /></svg>
      </span>
      <span>{msg}</span>
      <Link to="/account" style={{ fontSize: 12, fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--brown)', textDecoration: 'none', flex: '0 0 auto' }}>View account</Link>
      <button onClick={() => setMsg('')} aria-label="Dismiss" style={{ background: 'none', border: '0', color: 'var(--muted)', cursor: 'pointer', fontSize: 16, padding: 4 }}>×</button>
    </div>
  )
}
