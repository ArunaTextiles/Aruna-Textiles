import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { lastSessionOrder } from '../lib/account'
import { fmtINR } from '../lib/api'
import type { Order } from '../lib/types'

export default function OrderSuccess() {
  const [params] = useSearchParams()
  const orderNo = params.get('order') || ''
  const method = params.get('method')
  const [o, setO] = useState<Order | null>(null)

  useEffect(() => {
    setO(lastSessionOrder())
  }, [])

  const paid = method === 'cod' ? false : true

  return (
    <div className="page store">
      <div className="wrap" style={{ maxWidth: 640, margin: '40px auto', textAlign: 'center', padding: '30px 0 80px' }}>
        <div style={{ width: 64, height: 64, margin: '0 auto 20px', borderRadius: '50%', background: 'var(--green)', display: 'grid', placeItems: 'center', color: '#fff' }}>
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M20 6 9 17l-5-5" /></svg>
        </div>
        <span className="store-eyebrow">Order {method === 'cod' ? 'placed' : 'confirmed'}</span>
        <h1 className="store-title" style={{ fontSize: 40 }}>Thank you{orderNo ? ` — ${orderNo}` : ''}.</h1>
        <p style={{ color: 'var(--ink-soft)', margin: '14px auto', maxWidth: '46ch', lineHeight: 1.7 }}>
          {method === 'cod'
            ? 'Your order is confirmed. Keep the total ready for the courier at delivery.'
            : 'Your payment is confirmed. Your rug has entered the workshop queue — we’ll email you at every stage.'}
        </p>

        {o && (
          <div className="cart-summary" style={{ textAlign: 'left', marginTop: 28, position: 'static' }}>
            <h3>Your order</h3>
            {o.items.map((it, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, padding: '8px 0', fontSize: 14, color: 'var(--ink-soft)' }}>
                <span>{it.name} × {it.qty}</span>
                <span className="num" style={{ color: 'var(--ink)' }}>{fmtINR(it.price * it.qty)}</span>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0 0', borderTop: '1px solid var(--edge)', marginTop: 8, fontSize: 18, fontWeight: 500 }}>
              <span>Total</span><span className="num">{fmtINR(o.total)}</span>
            </div>
            <p style={{ fontSize: 12.5, color: 'var(--ink-soft)', marginTop: 10 }}>
              Delivering to {o.address?.city ? `${o.address.city}, ${o.address.state}` : 'your address'}{o.customer?.phone ? ` · ${o.customer.phone}` : ''}
            </p>
          </div>
        )}

        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginTop: 30 }}>
          <Link className="s-btn" to={`/order/${orderNo || 'account'}`} style={orderNo ? {} : { display: 'none' }}>Track order</Link>
          <Link className="s-btn" to="/shop">Continue shopping</Link>
          <Link className="s-btn ghost" to="/account">View my orders</Link>
        </div>
        {paid && <p style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 18 }}>A confirmation has been sent to your email.</p>}
      </div>
    </div>
  )
}
