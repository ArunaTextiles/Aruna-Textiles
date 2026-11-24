import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { hasSupabase } from '../lib/supabase'
import { myOrders, lastSessionOrder, accessToken } from '../lib/account'
import { linkFromUrl, saveUserName } from '../lib/auth'
import { stageOf } from '../lib/orders'
import { api, fmtINR } from '../lib/api'
import { openRazorpay } from '../lib/razorpay'
import SignIn from '../components/SignIn'
import type { Order } from '../lib/types'

type Tab = 'orders' | 'profile'
type OTab = 'all' | 'processing' | 'shipped' | 'delivered' | 'cancelled'

export default function Account() {
  const { user, setUser, signOut } = useAuth()
  const nav = useNavigate()
  const [tab, setTab] = useState<Tab>('orders')
  const [orders, setOrders] = useState<Order[] | null>(null)
  const [otab, setOtab] = useState<OTab>('all')
  const [err, setErr] = useState('')
  const [paying, setPaying] = useState('')
  const [payMsg, setPayMsg] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!user) { setOrders(null); return }
    setErr('')
    myOrders().then(setOrders).catch((e) => {
      setOrders(lastSessionOrder() ? [lastSessionOrder()!] : [])
      setErr(e instanceof Error ? e.message : 'Could not load your orders.')
    })
  }, [user])

  const groups: { id: OTab; label: string; list: Order[] }[] = useMemo(() => {
    const all = orders || []
    return [
      { id: 'all', label: 'All Orders', list: all },
      { id: 'processing', label: 'Processing', list: all.filter((o) => ['placed', 'confirmed', 'packed'].includes(o.status)) },
      { id: 'shipped', label: 'Shipped', list: all.filter((o) => ['shipped', 'out_for_delivery'].includes(o.status)) },
      { id: 'delivered', label: 'Delivered', list: all.filter((o) => o.status === 'delivered') },
      { id: 'cancelled', label: 'Cancelled', list: all.filter((o) => ['cancelled', 'returned'].includes(o.status)) },
    ]
  }, [orders])

  // finish paying an unpaid online order (reopens the same Razorpay order)
  const completePayment = async (o: Order) => {
    if (!user) return
    setPaying(o.orderNo)
    setPayMsg((m) => ({ ...m, [o.orderNo]: '' }))
    try {
      const token = await accessToken()
      const created = await api.retryPayment(o.orderNo, token)
      const r = await new Promise<{ ok: boolean; error?: string }>((resolve) => {
        openRazorpay(
          created.razorpayOrder,
          async (resp) => {
            try {
              await fetch('/api/checkout/verify', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  razorpay_order_id: resp.razorpay_order_id,
                  razorpay_payment_id: resp.razorpay_payment_id,
                  razorpay_signature: resp.razorpay_signature,
                }),
              })
            } catch { /* webhook still confirms */ }
            resolve({ ok: true })
          },
          () => resolve({ ok: false, error: 'Payment was not completed. No amount has been charged — you can try again.' }),
        ).catch(() => resolve({ ok: false, error: 'Could not open the payment window. Please try again.' }))
      })
      if (r.ok) {
        setPayMsg((m) => ({ ...m, [o.orderNo]: 'Payment received — thank you!' }))
        setOrders(await myOrders().catch(() => orders))
      } else {
        setPayMsg((m) => ({ ...m, [o.orderNo]: r.error || 'Payment could not be completed.' }))
      }
    } catch (e) {
      setPayMsg((m) => ({ ...m, [o.orderNo]: e instanceof Error ? e.message : 'Could not start payment.' }))
    } finally {
      setPaying('')
    }
  }

  const first = (user?.name || user?.email || '').split(/[@\s.]+/)[0]

  if (!hasSupabase)
    return (
      <div className="page store"><div className="wrap" style={{ maxWidth: 560, margin: '40px auto', textAlign: 'center' }}>
        <p className="muted">Accounts are available once the store is connected.</p>
        <Link to="/shop" className="s-btn" style={{ marginTop: 16 }}>Explore the collection</Link>
      </div></div>
    )

  // a used/expired email link arrives with ?error_code=… — surface it on the sign-in view
  const linkErr = (() => {
    const l = linkFromUrl()
    if (l.errorCode === 'otp_expired') return 'That email link has expired or was already used. Sign in below, or request a new code.'
    return l.errorText || ''
  })()

  if (!user)
    return (
      <div className="page store"><div className="wrap" style={{ maxWidth: 560, margin: '40px auto' }}>
        {/* the sign-in card carries its own logo + heading — no second page header */}
        <SignIn title="Sign in to your account" intro="Follow your orders, keep your bag on every device and check out faster." onDone={(u) => u && setUser({ id: u.id, email: u.email || '' })} />
        {linkErr && <p role="status" style={{ textAlign: 'center', marginTop: 14, fontSize: 13.5, color: '#a02c1d', background: '#f6e0dc', padding: '10px 14px' }}>{linkErr}</p>}
        <p style={{ textAlign: 'center', marginTop: 18, fontSize: 13, color: 'var(--ink-soft)' }}>
          New here? Creating an account keeps your bag and order history on every device.
        </p>
      </div></div>
    )

  const active = groups.find((g) => g.id === otab)!.list

  return (
    <div className="page store">
      <div className="wrap">
        <div style={{ padding: '26px 0 6px' }}>
          <span className="store-eyebrow">My Account</span>
          <h1 className="store-title" style={{ fontSize: 36 }}>Hello, {first || 'there'}.</h1>
        </div>

        <div className="acct">
          <aside className="acct-side">
            <div className="acct-user">
              <div className="acct-ava">{(first || '?')[0].toUpperCase()}</div>
              <div style={{ minWidth: 0 }}>
                <b>{user.name?.split(' ')[0] || 'Your account'}</b>
                <span>{user.email}</span>
              </div>
            </div>
            <nav className="acct-menu">
              <button className={tab === 'orders' ? 'on' : ''} onClick={() => setTab('orders')}><Ico d="M3 7h18M3 12h18M3 17h12" /> My Orders</button>
              <button className={tab === 'profile' ? 'on' : ''} onClick={() => setTab('profile')}><Ico d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10zM3 22a9 9 0 0 1 18 0" /> Profile</button>
              <button onClick={() => nav('/shop')}><Ico d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4zM3 6h18" /> Continue shopping</button>
              <button className="signout" onClick={() => signOut().catch(() => {})}><Ico d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" /> Sign out</button>
            </nav>
          </aside>

          <div>
            {tab === 'orders' ? (
              <>
                <div className="ord-tabs">
                  {groups.map((g) => (
                    <button key={g.id} className={`ord-tab ${otab === g.id ? 'on' : ''}`} onClick={() => setOtab(g.id)}>
                      {g.label} <span className="n">({g.list.length})</span>
                    </button>
                  ))}
                </div>
                {err && <p className="co-err" style={{ marginBottom: 12 }}>Could not load your orders: {err}</p>}
                {orders === null ? (
                  <div className="ord-card" style={{ height: 140, animation: 'pulse 1.2s infinite alternate' }} />
                ) : active.length === 0 ? (
                  <div className="ord-card" style={{ textAlign: 'center', padding: '50px 20px' }}>
                    <p style={{ fontFamily: "'Gilda Display', serif", fontSize: 22, margin: 0 }}>{otab === 'all' ? 'No orders yet' : `No ${otab} orders`}</p>
                    <p className="muted" style={{ margin: '8px 0 20px' }}>When you place an order, you can follow every step here.</p>
                    <Link to="/shop" className="s-btn">Explore the collection</Link>
                  </div>
                ) : (
                  active.map((o) => <OrderCard key={o.id} o={o} paying={paying} payMsg={payMsg} onPay={completePayment} />)
                )}
              </>
            ) : (
              <Profile user={user} onName={(n) => { saveUserName(n).then(() => setUser({ ...user, name: n })).catch(() => {}) }} onSignOut={() => signOut().catch(() => {})} onBrowse={() => nav('/shop')} />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Profile: editable name + sign out, in the same card style ──
function Profile({ user, onName, onSignOut, onBrowse }: {
  user: { email: string; name?: string }
  onName: (n: string) => void
  onSignOut: () => void
  onBrowse: () => void
}) {
  const [name, setName] = useState(user.name || '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [err, setErr] = useState('')

  const save = () => {
    if (!name.trim()) return setErr('Please enter your name.')
    setErr(''); setSaving(true)
    try { onName(name.trim()) } catch { /* ignore */ }
    setSaving(false); setSaved(true)
    setTimeout(() => setSaved(false), 1600)
  }

  return (
    <div className="acct-card">
      <div className="acct-card-row">
        <div className="acct-card-head"><h2>Profile</h2><span className="muted" style={{ fontSize: 13 }}>{user.email}</span></div>
        <div style={{ flex: 1, maxWidth: 360 }}>
          <label className="co-field"><span className="co-lbl">Full name</span>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your full name" /></label>
          {err && <p className="co-err" style={{ marginTop: 6 }}>{err}</p>}
          <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
            <button className="s-btn sm" onClick={save} disabled={saving || !name.trim()}>{saved ? 'Saved ✓' : saving ? 'Saving…' : 'Save'}</button>
            <button className="s-btn ghost sm" onClick={onBrowse}>Continue shopping</button>
          </div>
        </div>
      </div>
      <div className="acct-card-row" style={{ borderTop: '1px solid var(--edge)' }}>
        <div className="acct-card-head"><h2>Session</h2><span className="muted" style={{ fontSize: 13 }}>Signed in as {user.email}</span></div>
        <button className="s-btn ghost sm" onClick={onSignOut}>Sign out</button>
      </div>
    </div>
  )
}

export function OrderCard({ o, compact, paying, payMsg, onPay }: { o: Order; compact?: boolean; paying?: string; payMsg?: Record<string, string>; onPay?: (o: Order) => void }) {
  const nav = useNavigate()
  const stage = stageOf(o.status)
  const units = o.items.reduce((n, i) => n + i.qty, 0)
  const payText = o.paymentStatus === 'refunded' ? 'Refunded' : o.paymentStatus === 'paid' ? 'Paid online' : o.paymentMethod === 'cod' ? 'Cash on Delivery' : o.status === 'awaiting_payment' ? 'Payment pending' : 'Paid'
  const canPay = o.status === 'awaiting_payment' && o.paymentMethod === 'online' && onPay

  return (
    <div className="ord-card">
      <div className="ord-top">
        <div>
          <div className="no num">Order #{o.orderNo}</div>
          <div className="when">Ordered on {new Date(o.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
        </div>
        <span className={`badge ${badgeClass(o.status)}`}>{stage.label}</span>
      </div>
      <div className="ord-items">
        {o.items.slice(0, compact ? 2 : 3).map((it, i) => (
          <div className="ord-item" key={i}>
            {it.image ? <img src={it.image} alt="" loading="lazy" /> : <div style={{ width: 72, height: 84, background: 'var(--sand)' }} />}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="oi-n">{it.name}</div>
              <div className="oi-meta">{it.technique || 'Aruna'} {it.size ? `· ${it.size}` : ''} · Qty: {it.qty}</div>
            </div>
            <span className="oi-price num">{fmtINR(it.price * it.qty)}</span>
          </div>
        ))}
      </div>
      <div className="ord-foot">
        <div>
          <span className="lbl">Total</span>
          <span className="tot num">{fmtINR(o.total)}</span>
          <span style={{ display: 'block', fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>{units} item{units > 1 ? 's' : ''} · {payText}</span>
        </div>
        <div className="ord-actions">
          {canPay && <button className="s-btn sm" disabled={paying === o.orderNo} onClick={() => onPay!(o)}>{paying === o.orderNo ? 'Opening…' : 'Complete Payment'}</button>}
          <button className="s-btn ghost sm" onClick={() => nav(`/order/${o.orderNo}`)}>View Details</button>
          {(o.status === 'shipped' || o.status === 'out_for_delivery') && (
            <button className="s-btn sm" onClick={() => nav(`/order/${o.orderNo}`)}>Track Order</button>
          )}
        </div>
      </div>
      {payMsg?.[o.orderNo] && <p role="status" style={{ margin: 0, padding: '12px 20px', borderTop: '1px solid var(--edge)', fontSize: 13.5, color: payMsg[o.orderNo].includes('thank') ? 'var(--ok)' : '#a02c1d' }}>{payMsg[o.orderNo]}</p>}
    </div>
  )
}

function badgeClass(s: string) {
  if (['delivered'].includes(s)) return 'green'
  if (['shipped', 'out_for_delivery'].includes(s)) return 'blue'
  if (['cancelled', 'returned'].includes(s)) return 'grey'
  if (['placed', 'confirmed', 'packed'].includes(s)) return 'amber'
  return ''
}

const Ico = ({ d }: { d: string }) => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d={d} /></svg>
)
