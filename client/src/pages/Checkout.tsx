import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { fmtINR } from '../lib/api'
import { openRazorpay } from '../lib/razorpay'

const FLAT_SHIPPING = 499 // shown as estimate; server recomputes at order creation

export default function Checkout() {
  const { items, subtotal, clear } = useCart()
  const nav = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', phone: '', line1: '', line2: '', city: '', state: '', pin: '', note: '' })
  const [payment, setPayment] = useState<'online' | 'cod'>('online')
  const [placing, setPlacing] = useState(false)
  const [err, setErr] = useState('')
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }))

  const shipping = subtotal >= 25000 ? 0 : FLAT_SHIPPING
  const total = subtotal + shipping

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setErr('')
    setPlacing(true)
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer: { name: form.name, email: form.email, phone: form.phone },
          address: form,
          payment,
          items: items.map((i) => ({ productSlug: i.product.slug, qty: i.qty, size: i.size })),
          note: form.note,
        }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error || 'Could not create the order.')

      if (payment === 'online' && body.razorpayOrder) {
        await openRazorpay(
          body.razorpayOrder,
          async (resp) => {
            // confirm on the server (signature check); the webhook is the source of truth
            try {
              await fetch('/api/checkout/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  razorpay_order_id: resp.razorpay_order_id,
                  razorpay_payment_id: resp.razorpay_payment_id,
                  razorpay_signature: resp.razorpay_signature,
                }),
              })
            } catch {
              /* webhook still confirms even if this call fails */
            }
            clear()
            nav(`/checkout/success?order=${body.orderNo}`)
          },
          () => setErr('Payment was not completed. No amount has been charged — you can try again.'),
        )
        setPlacing(false)
        return
      }
      clear()
      nav(`/checkout/success?order=${body.orderNo}&method=${payment}`)
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : 'Something went wrong.')
      setPlacing(false)
    }
  }

  if (items.length === 0)
    return (
      <div className="page"><div className="wrap">
        <p className="muted">Your cart is empty. <Link to="/shop">Browse the collection</Link></p>
      </div></div>
    )

  return (
    <div className="page">
      <div className="wrap co">
        <form onSubmit={submit}>
          <h1>Checkout</h1>

          <section className="co-sec">
            <h2><b>01</b> Contact</h2>
            <div className="co-grid">
              <label>Full name<input required value={form.name} onChange={(e) => set('name', e.target.value)} /></label>
              <label>Email<input required type="email" value={form.email} onChange={(e) => set('email', e.target.value)} /></label>
              <label>Phone / WhatsApp<input required value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="+91" /></label>
            </div>
          </section>

          <section className="co-sec">
            <h2><b>02</b> Delivery address</h2>
            <div className="co-grid">
              <label style={{ gridColumn: '1 / -1' }}>Address line 1<input required value={form.line1} onChange={(e) => set('line1', e.target.value)} /></label>
              <label style={{ gridColumn: '1 / -1' }}>Address line 2 (optional)<input value={form.line2} onChange={(e) => set('line2', e.target.value)} /></label>
              <label>City<input required value={form.city} onChange={(e) => set('city', e.target.value)} /></label>
              <label>State<input required value={form.state} onChange={(e) => set('state', e.target.value)} /></label>
              <label>PIN code<input required pattern="\d{6}" value={form.pin} onChange={(e) => set('pin', e.target.value)} /></label>
            </div>
            <div className="co-grid" style={{ marginTop: 14 }}>
              <label style={{ gridColumn: '1 / -1' }}>Note for the workshop (optional)<input value={form.note} onChange={(e) => set('note', e.target.value)} placeholder="Delivery windows, packaging, gift note…" /></label>
            </div>
          </section>

          <section className="co-sec">
            <h2><b>03</b> Payment</h2>
            <div className="pay-opts">
              <label className={`pay-opt ${payment === 'online' ? 'on' : ''}`}>
                <input type="radio" checked={payment === 'online'} onChange={() => setPayment('online')} />
                <div><b>Pay online</b><span style={{ color: 'var(--ink-soft)', fontSize: 12 }}>Razorpay — cards, UPI, wallets</span></div>
              </label>
              <label className={`pay-opt ${payment === 'cod' ? 'on' : ''}`}>
                <input type="radio" checked={payment === 'cod'} onChange={() => setPayment('cod')} />
                <div><b>Cash on delivery</b><span style={{ color: 'var(--ink-soft)', fontSize: 12 }}>Pay when your rug arrives</span></div>
              </label>
            </div>
            {err && <p className="co-err">{err}</p>}
            <button className="btn co-pay" type="submit" disabled={placing}>
              {placing ? 'Preparing…' : payment === 'online' ? `Pay ${fmtINR(total)}` : 'Place Order'}
            </button>
          </section>
        </form>

        <aside className="co-summary">
          <h3>Your order</h3>
          {items.map((i, k) => (
            <div className="co-line" key={k}>
              <span>{i.product.name} × {i.qty}{i.size ? ` (${i.size})` : ''}</span>
              <span>{fmtINR(i.product.price * i.qty)}</span>
            </div>
          ))}
          <div className="co-line"><span>Subtotal</span><span>{fmtINR(subtotal)}</span></div>
          <div className="co-line"><span>Shipping{shipping === 0 ? ' (free)' : ''}</span><span>{shipping === 0 ? 'Free' : fmtINR(shipping)}</span></div>
          <div className="co-line total"><span>Total</span><b>{fmtINR(total)}</b></div>
        </aside>
      </div>
    </div>
  )
}
