import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { orderByNo } from '../lib/account'
import { ORDER_STAGES, fmtDateTime } from '../lib/orders'
import { fmtINR } from '../lib/api'
import { useCart } from '../context/CartContext'
import type { Order, Product } from '../lib/types'

export default function OrderDetail() {
  const { orderNo } = useParams<{ orderNo: string }>()
  const [o, setO] = useState<Order | null>(null)
  const [err, setErr] = useState('')
  const [again, setAgain] = useState(false)
  const nav = useNavigate()
  const { add } = useCart()

  useEffect(() => {
    if (!orderNo) return
    orderByNo(orderNo).then((r) => {
      if (r) setO(r)
      else setErr('We couldn’t find that order. Check the number, or sign in to view your orders.')
    }).catch(() => setErr('Could not load this order just now.'))
  }, [orderNo])

  if (err)
    return (
      <div className="page store"><div className="wrap" style={{ maxWidth: 560, margin: '40px auto', textAlign: 'center' }}>
        <p className="muted">{err}</p>
        <Link to="/account" className="s-btn" style={{ marginTop: 18 }}>Go to My Orders</Link>
      </div></div>
    )

  if (!o)
    return <div className="page store"><div className="wrap"><p className="muted" style={{ padding: '60px 0' }}>Loading your order…</p></div></div>

  // build a timeline from the order status (statuses before the current one are "done")
  const orderIdx = ORDER_STAGES.findIndex((s) => s.id === o.status)
  const doneCount = o.status === 'delivered' ? ORDER_STAGES.length : Math.max(0, orderIdx + 1)
  const base = new Date(o.createdAt).getTime()

  // re-add every item to the bag from a past order (matches on slug where available)
  const buyAgain = () => {
    o.items.forEach((it) => {
      const p: Product = {
        id: it.slug || it.name,
        slug: it.slug || '',
        name: it.name,
        technique: (it.technique as Product['technique']) || 'Handtufted',
        price: it.price,
        image: it.image || '',
        stock: it.qty,
        published: true,
      }
      add(p, it.qty, it.size)
    })
    setAgain(true)
    setTimeout(() => nav('/cart'), 600)
  }

  const invoice = () => {
    const html = `<pre>${o.orderNo}
Placed ${fmtDateTime(o.createdAt)}
${o.items.map((i) => `${i.name} x${i.qty} — ${fmtINR(i.price * i.qty)}`).join('\n')}
Subtotal ${fmtINR(o.subtotal)}
Total ${fmtINR(o.total)}\n\nThank you for shopping at Aruna Textile.</pre>`
    const w = window.open('', '_blank', 'width=460,height=600')
    if (w) { w.document.write(`<!doctype html><title>Invoice ${o.orderNo}</title><style>body{font-family:monospace;padding:24px;color:#1e1812}</style><h2>Aruna Textile — Invoice</h2>${html}`); w.document.close(); w.focus() }
  }

  return (
    <div className="page store">
      <div className="wrap">
        <nav className="crumbs" aria-label="Breadcrumb">
          <Link to="/account">My Orders</Link><span className="sep">/</span>
          <span className="here">Order #{o.orderNo}</span>
        </nav>

        <div className="od-top">
          <div>
            <h1>Order <span className="num">{o.orderNo}</span></h1>
            <div className="od-meta">Ordered on {fmtDateTime(o.createdAt)} · Total {o.paymentStatus === 'paid' ? 'Paid' : o.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Pending'}: <b>{fmtINR(o.total)}</b></div>
          </div>
          <span className={`badge ${o.status === 'delivered' ? 'green' : o.status === 'cancelled' ? 'grey' : 'blue'}`}>{o.status.replace(/_/g, ' ')}</span>
        </div>

        <div className="od-grid">
          {/* left: tracking + items */}
          <div>
            <div className="od-card">
              <h3>Order Tracking</h3>
              <div className="body">
                <ul className="timeline">
                  {ORDER_STAGES.map((s, i) => {
                    const isDone = i < doneCount
                    const when = base + i * 36e5
                    return (
                      <li key={s.id} className={isDone ? 'done' : ''}>
                        <span className="dot" />
                        <div className="t-lbl">{s.label}</div>
                        <div className="t-dt">{isDone ? fmtDateTime(when) : '—'}</div>
                        {isDone && <div className="t-note">{s.customer}</div>}
                      </li>
                    )
                  })}
                </ul>
                {o.trackingNo && <p style={{ fontSize: 13, color: 'var(--ink-soft)', marginTop: 8 }}>Tracking ID: <b className="num">{o.trackingNo}</b></p>}
              </div>
            </div>

            <div className="od-card">
              <h3>Order Items ({o.items.length})</h3>
              <div className="ord-items">
                {o.items.map((it, i) => (
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
            </div>
          </div>

          {/* right: actions + delivery */}
          <div className="od-col">
            <div className="od-card">
              <h3>Order Actions</h3>
              <div className="body od-actions">
                <button className="od-action" onClick={invoice}><Ico d="M12 3v12M8 11l4 4 4-4M4 21h16" /> Download Invoice</button>
                {o.trackingUrl ? (
                  <a className="od-action" href={o.trackingUrl} target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}><Ico d="M1 3h15v13H1zM16 8h4l3 3v5h-7z" /> Track Shipment</a>
                ) : null}
                <button className="od-action" onClick={buyAgain}><Ico d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4zM3 6h18" /> {again ? 'Added ✓' : 'Buy Again'}</button>
                <button className="od-action" onClick={() => nav('/contact')}><Ico d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /> Contact Support</button>
              </div>
            </div>

            <div className="od-card">
              <h3>Delivery Address</h3>
              <div className="body">
                <div className="od-deliv">
                  <b>{o.customer.name}</b>
                  {o.address.line1}, {o.address.line2 ? `${o.address.line2}, ` : ''}{o.address.city}, {o.address.state} — {o.address.pin}
                  {o.customer.phone && <div style={{ marginTop: 6 }}>Phone: <span className="num">{o.customer.phone}</span></div>}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

const Ico = ({ d }: { d: string }) => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d={d} /></svg>
)
