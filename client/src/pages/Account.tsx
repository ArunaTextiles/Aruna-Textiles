import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { hasSupabase } from '../lib/supabase'
import { myOrders, lastSessionOrder } from '../lib/account'
import { DONE, stageOf } from '../lib/orders'
import { fmtINR } from '../lib/api'
import SignIn from '../components/SignIn'
import type { Order } from '../lib/types'

type Tab = 'all' | 'processing' | 'shipped' | 'delivered' | 'cancelled'

export default function Account() {
  const { user, signOut } = useAuth()
  const nav = useNavigate()
  const [orders, setOrders] = useState<Order[] | null>(null)
  const [tab, setTab] = useState<Tab>('all')
  const [err, setErr] = useState('')

  useEffect(() => {
    if (!user) { setOrders(null); return }
    setErr('')
    myOrders().then(setOrders).catch((e) => {
      setOrders(lastSessionOrder() ? [lastSessionOrder()!] : [])
      setErr(e instanceof Error ? e.message : 'Could not load your orders.')
    })
  }, [user])

  const groups: { id: Tab; label: string; list: Order[] }[] = useMemo(() => {
    const all = orders || []
    const proc = all.filter((o) => ['placed', 'confirmed', 'packed'].includes(o.status))
    const ship = all.filter((o) => ['shipped', 'out_for_delivery'].includes(o.status))
    const deliv = all.filter((o) => o.status === 'delivered')
    const canc = all.filter((o) => ['cancelled', 'returned'].includes(o.status))
    return [
      { id: 'all', label: 'All Orders', list: all },
      { id: 'processing', label: 'Processing', list: proc },
      { id: 'shipped', label: 'Shipped', list: ship },
      { id: 'delivered', label: 'Delivered', list: deliv },
      { id: 'cancelled', label: 'Cancelled', list: canc },
    ]
  }, [orders])

  const first = (user?.name || user?.email || '').split(/[@\s.]+/)[0]

  if (!hasSupabase)
    return (
      <div className="page store"><div className="wrap" style={{ maxWidth: 560, margin: '40px auto', textAlign: 'center' }}>
        <p className="muted">Accounts are available once the store is connected.</p>
        <Link to="/shop" className="s-btn" style={{ marginTop: 16 }}>Explore the collection</Link>
      </div></div>
    )

  if (!user)
    return (
      <div className="page store"><div className="wrap" style={{ maxWidth: 560, margin: '40px auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 22 }}>
          <span className="store-eyebrow">My Account</span>
          <h1 className="store-title" style={{ fontSize: 34 }}>Sign in</h1>
          <p style={{ color: 'var(--ink-soft)', margin: '8px 0 24px' }}>Follow your orders and keep your bag on every device.</p>
        </div>
        <SignIn title="Sign in to your account" />
      </div></div>
    )

  const active = groups.find((g) => g.id === tab)!.list

  return (
    <div className="page store">
      <div className="wrap">
        <div style={{ padding: '26px 0 6px' }}>
          <span className="store-eyebrow">My Account</span>
          <h1 className="store-title" style={{ fontSize: 36 }}>My Orders</h1>
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
              <Link to="/account" className="on"><Ico d="M3 7h18M3 12h18M3 17h12" /> My Orders</Link>
              <Link to="/account"><Ico d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10zM3 22a9 9 0 0 1 18 0" /> Profile</Link>
              <button onClick={() => nav('/shop')}><Ico d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4zM3 6h18" /> Addresses</button>
              <button onClick={() => nav('/shop')}><Ico d="M12 21s-7-4.5-9.5-9C1 8.5 2.5 5 6 5c2 0 3.5 1.5 6 4 2.5-2.5 4.5-4 6.5-4 3.5 0 4.5 3.5 3.5 7-2.5 4.5-10 9-10 9z" /> Wishlist</button>
              <button className="signout" onClick={() => signOut().catch(() => {})}><Ico d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" /> Log Out</button>
            </nav>
          </aside>

          <div>
            <div className="ord-tabs">
              {groups.map((g) => (
                <button key={g.id} className={`ord-tab ${tab === g.id ? 'on' : ''}`} onClick={() => setTab(g.id)}>
                  {g.label} <span className="n">({g.list.length})</span>
                </button>
              ))}
            </div>

            {err && <p className="co-err" style={{ marginBottom: 12 }}>Could not load your orders: {err}</p>}

            {orders === null ? (
              <div className="ord-card" style={{ height: 140, animation: 'pulse 1.2s infinite alternate' }} />
            ) : active.length === 0 ? (
              <div className="ord-card" style={{ textAlign: 'center', padding: '50px 20px' }}>
                <p style={{ fontFamily: "'Gilda Display', serif", fontSize: 22, margin: 0 }}>{tab === 'all' ? 'No orders yet' : `No ${tab} orders`}</p>
                <p className="muted" style={{ margin: '8px 0 20px' }}>When you place an order, you can follow every step here.</p>
                <Link to="/shop" className="s-btn">Explore the collection</Link>
              </div>
            ) : (
              active.map((o) => <OrderCard key={o.id} o={o} />)
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export function OrderCard({ o, compact }: { o: Order; compact?: boolean }) {
  const nav = useNavigate()
  const stage = stageOf(o.status)
  const units = o.items.reduce((n, i) => n + i.qty, 0)
  const payText = o.paymentStatus === 'refunded' ? 'Refunded' : o.paymentStatus === 'paid' ? 'Paid online' : o.paymentMethod === 'cod' ? 'Cash on Delivery' : o.status === 'awaiting_payment' ? 'Payment pending' : 'Paid'

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
          {o.status === 'awaiting_payment' && o.paymentMethod === 'online' && (
            <button className="s-btn sm" onClick={() => nav('/account')}>Complete Payment</button>
          )}
          <button className="s-btn ghost sm" onClick={() => nav(`/order/${o.orderNo}`)}>View Details</button>
          {(o.status === 'shipped' || o.status === 'out_for_delivery') && (
            <button className="s-btn sm" onClick={() => nav(`/order/${o.orderNo}`)}>Track Order</button>
          )}
        </div>
      </div>
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
