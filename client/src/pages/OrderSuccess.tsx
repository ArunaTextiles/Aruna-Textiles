import { Link, useSearchParams } from 'react-router-dom'

export default function OrderSuccess() {
  const [params] = useSearchParams()
  const orderNo = params.get('order')
  const method = params.get('method')
  return (
    <div className="page">
      <div className="wrap" style={{ maxWidth: 640, textAlign: 'center' }}>
        <span className="kicker">ORDER PLACED</span>
        <h1 className="h-xl">Thank you{orderNo ? ` — ${orderNo}` : ''}.</h1>
        <p className="lead" style={{ margin: '18px auto; maxWidth: 48ch' }}>
          {method === 'cod'
            ? 'Your order is confirmed. Keep the total ready for the courier at delivery.'
            : 'Your payment is confirmed. Your rug has entered the workshop queue — we’ll email you at every stage.'}
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginTop: 28 }}>
          <Link className="btn" to="/shop">Continue shopping</Link>
          <Link className="btn" style={{ background: 'transparent', color: 'var(--ink)' }} to="/#custom">Start a custom order</Link>
        </div>
      </div>
    </div>
  )
}
