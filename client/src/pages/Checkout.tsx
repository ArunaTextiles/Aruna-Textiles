import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { useAuth } from '../context/AuthContext'
import { hasSupabase } from '../lib/supabase'
import { fmtINR } from '../lib/api'
import { openRazorpay, type RzpSuccess } from '../lib/razorpay'
import { findCoupon, couponDiscount } from '../lib/coupons'
import { lookupPin } from '../lib/pincode'
import { storeConfig, DEFAULT_STORE } from '../lib/storeConfig'
import { rememberOrder, placeOrderDirect } from '../lib/account'
import SignIn from '../components/SignIn'
import type { Order } from '../lib/types'

// Friendly error copy (the Kridhya reference). Every failure message is honest:
// an order the service created is a real held order; nothing is ever faked.
const friendly = (m = '') =>
  m.startsWith('OUT_OF_STOCK:') ? `Sorry — ${m.slice(13).split('|')[0]} has just sold out. Please update your bag.`
    : m.startsWith('UNAVAILABLE:') ? `Sorry — ${m.slice(12)} is no longer available. Please remove it from your bag.`
      : m === 'INVALID_DETAILS' ? 'Please check your details and try again.'
        : m || 'We could not place your order just now. Please try again, or message us on WhatsApp.'

export default function Checkout() {
  const { items, clear } = useCart()
  const { user, ready, setUser } = useAuth()
  const nav = useNavigate()
  // One single form — no steps, no progress. Contact → address → payment, submitted together.
  const [form, setForm] = useState({ name: '', email: '', phone: '', address: '', address2: '', city: '', state: '', pin: '' })
  const [payment, setPayment] = useState<'online' | 'cod'>(() => (DEFAULT_STORE.onlinePayments ? 'online' : 'cod'))
  const [placing, setPlacing] = useState(false)
  const [fail, setFail] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [pinInfo, setPinInfo] = useState<{ found: boolean; city?: string; state?: string } | null>(null)
  const [coupon, setCoupon] = useState<string>(() => sessionStorage.getItem('aruna-coupon') || '')
  const [applied, setApplied] = useState<string>(() => sessionStorage.getItem('aruna-coupon') || '')
  const [couponMsg, setCouponMsg] = useState<{ text: string; ok: boolean } | null>(null)
  const [ship, setShip] = useState(DEFAULT_STORE)

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((f) => ({ ...f, [k]: e.target.value }))
    setErrors((er) => (er[k] ? { ...er, [k]: '' } : er)) // typing in a flagged field clears its error
  }
  const pin = form.pin.trim()
  const errFor = (k: string) => (errors[k] ? <span role="alert" style={{ display: 'block', fontSize: 12, color: '#a02c1d', marginTop: 4 }}>{errors[k]}</span> : null)

  // live store config (shipping fee + free threshold + which payment methods are on),
  // so the displayed total and the payment options always match the server
  useEffect(() => {
    storeConfig().then((c) => {
      setShip(c)
      setPayment((p) => (p === 'online' && !c.onlinePayments ? (c.cod ? 'cod' : 'online') : p))
      setPayment((p) => (p === 'cod' && !c.cod ? (c.onlinePayments ? 'online' : 'cod') : p))
    })
  }, [])

  // prefill from the signed-in user
  useEffect(() => {
    if (!user) return
    setForm((f) => ({ ...f, email: f.email || user.email || '' }))
  }, [user])

  // PIN code -> city + state
  useEffect(() => {
    if (!/^\d{6}$/.test(pin)) { setPinInfo(null); return }
    let live = true
    lookupPin(pin).then((r) => {
      if (!live || !r) return
      setPinInfo(r)
      if (r.found) setForm((f) => ({ ...f, city: f.city || r.city || '', state: f.state || r.state || '' }))
    })
    return () => { live = false }
  }, [pin])

  // coupon -> live discount (only counts once explicitly applied)
  const discount = useMemo(() => {
    if (!applied) return 0
    const subtotal = items.reduce((n, i) => n + i.product.price * i.qty, 0)
    return couponDiscount(findCoupon(applied), subtotal)
  }, [applied, items])

  const applyCoupon = () => {
    if (!coupon.trim()) return
    const c = findCoupon(coupon)
    const subtotal = items.reduce((n, i) => n + i.product.price * i.qty, 0)
    if (c) {
      setApplied(c.code)
      setCouponMsg({ text: `Coupon applied! You saved ${fmtINR(couponDiscount(c, subtotal))}.`, ok: true })
      try { sessionStorage.setItem('aruna-coupon', c.code) } catch { /* ignore */ }
    } else {
      setApplied('')
      setCouponMsg({ text: `“${coupon.trim().toUpperCase()}” isn’t a valid code.`, ok: false })
      try { sessionStorage.removeItem('aruna-coupon') } catch { /* ignore */ }
    }
  }

  const subtotal = items.reduce((n, i) => n + i.product.price * i.qty, 0)
  const shipping = ship.freeShippingAbove > 0 && subtotal >= ship.freeShippingAbove ? 0 : ship.flatShipping
  const total = Math.max(0, subtotal - discount + shipping)

  const bagItems = items.map((i) => ({ productSlug: i.product.slug, name: i.product.name, technique: i.product.technique, size: i.size, qty: i.qty, price: i.product.price, image: i.product.image }))

  const makeOrder = (id: string): Order => ({
    id,
    orderNo: id,
    status: payment === 'cod' ? 'placed' : 'awaiting_payment',
    paymentStatus: 'pending',
    paymentMethod: payment,
    customer: { name: form.name, email: form.email, phone: form.phone },
    address: { line1: form.address, line2: form.address2, city: form.city, state: form.state, pin },
    items: bagItems,
    subtotal,
    shipping,
    discount,
    coupon: discount ? applied.toUpperCase() : undefined,
    total,
    createdAt: new Date().toISOString(),
  })

  const finish = (o: Order) => {
    rememberOrder(o)
    clear()
    sessionStorage.removeItem('aruna-coupon')
    nav(`/checkout/success?order=${encodeURIComponent(o.orderNo)}&method=${o.paymentMethod}`)
  }

  const payOptions = [
    ship.onlinePayments && { id: 'online' as const, label: 'Pay online', hint: 'UPI, cards, net banking and wallets — secured by Razorpay' },
    ship.cod && { id: 'cod' as const, label: 'Cash on Delivery', hint: 'Pay when your rug arrives' },
  ].filter(Boolean) as { id: 'online' | 'cod'; label: string; hint: string }[]
  const payOn = (id: 'online' | 'cod') => payOptions.some((o) => o.id === id)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setFail('')
    // Kridhya-style per-field validation: each required field gets its own message,
    // and the first invalid input is focused so the shopper knows exactly what to fix.
    const err: Record<string, string> = {}
    if (!form.name.trim()) err.name = 'Please enter your full name.'
    if (!/^\S+@\S+\.\S+$/.test(form.email)) err.email = 'Please enter a valid email address.'
    if (form.phone.replace(/\D/g, '').length < 10) err.phone = 'Please enter a 10-digit phone number.'
    if (!form.address.trim()) err.address = 'Please enter your address.'
    if (!form.city.trim()) err.city = 'Please enter your city.'
    if (!form.state.trim()) err.state = 'Please enter your state.'
    if (!/^\d{6}$/.test(pin)) err.pin = 'Please enter a 6-digit PIN code.'
    setErrors(err)
    if (Object.keys(err).length) {
      document.getElementById(`co-${Object.keys(err)[0]}`)?.focus()
      return
    }

    // local order skeleton (prices from the server override these later) — this is
    // the `base` the Kridhya flow spreads when it finishes, so it's always defined.
    const base = makeOrder('')

    setPlacing(true)
    try {
      // 1) the real order service (prices/stock/razorpay all server-authoritative)
      //    with a hard timeout — if the API hangs, fail fast instead of sitting on
      //    "Preparing…" forever.
      const ctrl = new AbortController()
      const t = setTimeout(() => ctrl.abort(), 25000)
      let res: Response
      try {
        res = await fetch('/api/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customer: { name: form.name, email: form.email, phone: form.phone },
            address: { line1: form.address, line2: form.address2, city: form.city, state: form.state, pin },
            items: bagItems,
            note: '',
            payment,
            coupon: applied || undefined,
          }),
          signal: ctrl.signal,
        })
      } finally {
        clearTimeout(t)
      }
      if (ctrl.signal.aborted) throw new Error('The order service took too long to respond.')
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`)

      const orderNo: string = body.orderNo
      // server is authoritative for the final numbers (total incl. shipping + discount)
      const serverTotal = typeof body.total === 'number' ? body.total : total
      const serverDiscount = typeof body.discount === 'number' ? body.discount : discount
      const serverCoupon = body.coupon || (discount ? applied.toUpperCase() : undefined)

      if (payment === 'online') {
        if (!body.razorpayOrder) throw new Error('Online payment is not configured on the store. Please choose Cash on Delivery.')
        const paid = await new Promise<boolean>((resolve) => {
          openRazorpay(
            body.razorpayOrder,
            async (resp: RzpSuccess) => {
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
              } catch { /* the webhook still confirms */ }
              resolve(true)
            },
            () => resolve(false),
          ).catch(() => resolve(false))
        })
        setPlacing(false)
        if (!paid) {
          // honest: the order exists (awaiting_payment) and can be paid later from My Orders
          return setFail('Payment was not completed. No amount has been charged — the order is held and you can pay it later from My Orders.')
        }
        return finish({ ...base, orderNo, total: serverTotal, discount: serverDiscount, coupon: serverCoupon, status: 'placed', paymentStatus: 'pending' })
      }

      // COD through the server
      setPlacing(false)
      return finish({ ...base, orderNo, total: serverTotal, discount: serverDiscount, coupon: serverCoupon })
    } catch (err) {
      // 2) order service unreachable
      if (payment === 'cod' && hasSupabase) {
        // Kridhya fallback: place the order directly in the database (no payment taken;
        // the team confirms it). Real order, real tracking — never a fake.
        try {
          const orderNo = await placeOrderDirect({
            customer: { name: form.name, email: form.email, phone: form.phone },
            address: { line1: form.address, line2: form.address2, city: form.city, state: form.state, pin },
            items: bagItems.map((i) => ({ slug: i.productSlug, size: i.size, qty: i.qty })),
            note: '',
            payment: 'cod',
            shipping,
            discount,
            coupon: discount ? applied.toUpperCase() : undefined,
            userId: user?.id,
          })
          setPlacing(false)
          return finish({ ...base, orderNo, status: 'placed' })
        } catch {
          /* fall through to the error message */
        }
      }
      setPlacing(false)
      if (payment === 'online') {
        setFail('The secure payment service is temporarily unavailable, so the payment gateway could not be opened. No amount has been charged — try again in a moment, or choose Cash on Delivery.')
      } else {
        setFail('We could not place your order just now. Please try again, or message us on WhatsApp.')
      }
      return
    }
  }

  // sign-in gate (like the reference): bag is kept, sign-in continues the flow
  if (items.length && hasSupabase && (!ready || !user)) {
    return (
      <div className="page store"><div className="wrap co-page" style={{ maxWidth: 560, margin: '30px auto', textAlign: 'center', padding: '40px 0 80px' }}>
        <span className="store-eyebrow" style={{ display: 'block', marginBottom: 18 }}>Checkout</span>
        <SignIn
          title="Sign in to check out"
          intro="Your bag is saved to your account, so you can pick up exactly where you left off."
          onDone={(u) => u && setUser({ id: u.id, email: u.email || '' })}
        />
        <button className="auth-link" style={{ display: 'block', margin: '18px auto 0', color: 'var(--ink-soft)' }} onClick={() => nav('/shop')}>← Continue shopping</button>
      </div></div>
    )
  }

  return (
    <div className="page store">
      <div className="wrap co-page">
        <span className="store-eyebrow">Checkout</span>
        <h1 className="store-title" style={{ fontSize: 38, margin: '2px 0 22px' }}>Checkout</h1>

        {items.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '50px 0' }}>
            <p className="muted">Your bag is empty.</p>
            <Link to="/shop" className="s-btn">Browse the collection</Link>
          </div>
        ) : (
          <form onSubmit={submit} noValidate>
            <div className="co-grid">
              <div>
                {/* contact */}
                <section className="co-card">
                  <h3><b style={{ color: 'var(--rust)' }}>01</b> Customer Information</h3>
                  <div className="co-2col">
                    <div className="co-field"><label htmlFor="co-name">Full Name *</label><input id="co-name" required value={form.name} onChange={set('name')} autoComplete="name" aria-invalid={!!errors.name} />{errFor('name')}</div>
                    <div className="co-field"><label htmlFor="co-phone">Mobile Number *</label><input id="co-phone" required type="tel" value={form.phone} onChange={set('phone')} placeholder="+91 98765 43210" autoComplete="tel" aria-invalid={!!errors.phone} />{errFor('phone')}</div>
                  </div>
                  <div className="co-field"><label htmlFor="co-email">Email Address *</label><input id="co-email" required type="email" value={form.email} onChange={set('email')} autoComplete="email" aria-invalid={!!errors.email} />{errFor('email')}</div>
                </section>

                {/* delivery address */}
                <section className="co-card" style={{ marginTop: 18 }}>
                  <h3><b style={{ color: 'var(--rust)' }}>02</b> Delivery Address</h3>
                  <div className="co-field"><label htmlFor="co-address">Address Line 1 *</label><input id="co-address" required value={form.address} onChange={set('address')} autoComplete="address-line1" aria-invalid={!!errors.address} />{errFor('address')}</div>
                  <div className="co-field"><label htmlFor="co-address2">Address Line 2 (optional)</label><input id="co-address2" value={form.address2} onChange={set('address2')} autoComplete="address-line2" /></div>
                  <div className="co-2col">
                    <div className="co-field"><label htmlFor="co-city">City *</label><input id="co-city" required value={form.city} onChange={set('city')} autoComplete="address-level2" aria-invalid={!!errors.city} />{errFor('city')}</div>
                    <div className="co-field"><label htmlFor="co-state">State *</label><input id="co-state" required value={form.state} onChange={set('state')} autoComplete="address-level1" aria-invalid={!!errors.state} />{errFor('state')}</div>
                    <div className="co-field">
                      <label htmlFor="co-pin">PIN Code *</label>
                      <input id="co-pin" required pattern="\d{6}" inputMode="numeric" maxLength={6} value={form.pin}
                        onChange={(e) => setForm((f) => ({ ...f, pin: e.target.value.replace(/\D/g, '').slice(0, 6) }))} autoComplete="postal-code" aria-invalid={!!errors.pin} />
                      {errFor('pin')}
                      {pinInfo?.found && <span className="hint ok">✓ {pinInfo.city}, {pinInfo.state}</span>}
                      {pinInfo && !pinInfo.found && <span className="hint" style={{ color: '#a02c1d' }}>We couldn’t find this PIN code — please check it.</span>}
                    </div>
                    <div className="co-field"><label>Country</label><input value="India" readOnly /></div>
                  </div>
                </section>

                {/* payment method */}
                <section className="co-card" style={{ marginTop: 18 }}>
                  <h3><b style={{ color: 'var(--rust)' }}>03</b> Payment Method</h3>
                  <div className="co-pay">
                    {payOptions.length ? payOptions.map((o) => (
                      <label key={o.id} className={`co-pay-opt ${payment === o.id ? 'on' : ''}`}>
                        <input type="radio" name="pay" checked={payment === o.id} onChange={() => setPayment(o.id)} />
                        <div><b>{o.label}</b><div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>{o.hint}</div></div>
                      </label>
                    )) : (
                      <p className="muted" style={{ fontSize: 13 }}>Payment options are being confirmed…</p>
                    )}
                  </div>
                  {ship.freeShippingAbove > 0 && subtotal < ship.freeShippingAbove && (
                    <p style={{ fontSize: 12, color: 'var(--rust)', marginTop: 10 }}>Add {fmtINR(ship.freeShippingAbove - subtotal)} more for free shipping.</p>
                  )}
                  {payOn('online') && payment === 'online' && (
                    <p style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 10 }}>A secure Razorpay window opens to complete your payment. Your card or UPI details never touch our site.</p>
                  )}
                </section>
              </div>

              {/* order summary — the single submit lives here, Kridhya-style */}
              <aside className="cart-summary">
                <h3>Order Summary</h3>
                {items.map((i) => (
                  <div key={`${i.product.id}|${i.size ?? ''}`} style={{ display: 'flex', gap: 12, padding: '12px 0', borderBottom: '1px solid var(--edge)' }}>
                    <img src={i.product.image} alt="" style={{ width: 56, height: 66, objectFit: 'cover', border: '1px solid var(--edge)', background: 'var(--sand)' }} />
                    <div style={{ flex: 1, fontSize: 13 }}>
                      <b style={{ fontFamily: "'Gilda Display', serif", fontWeight: 400, fontSize: 15 }}>{i.product.name}</b>
                      <div style={{ color: 'var(--ink-soft)' }}>{i.size ? `Size: ${i.size}` : i.product.technique} · Qty: {i.qty}</div>
                    </div>
                    <span className="num" style={{ fontSize: 14 }}>{fmtINR(i.product.price * i.qty)}</span>
                  </div>
                ))}
                <div className="sum-line" style={{ marginTop: 14 }}><span>Subtotal</span><span className="num">{fmtINR(subtotal)}</span></div>
                <div className="coupon-row">
                  <input value={coupon} onChange={(e) => setCoupon(e.target.value)} placeholder="Discount code" aria-label="Coupon code" />
                  <button type="button" className="s-btn sm" onClick={applyCoupon}>Apply</button>
                </div>
                {couponMsg && <div className={`coupon-msg ${couponMsg.ok ? '' : 'err'}`}>{couponMsg.text}</div>}
                {discount > 0 && !couponMsg && <div className="coupon-msg">Coupon applied! You saved {fmtINR(discount)}.</div>}
                <div className="sum-line"><span>Shipping</span><span className="num">{shipping === 0 ? 'Free' : fmtINR(shipping)}</span></div>
                <div className="sum-line total"><span>Total</span><span className="num">{fmtINR(total)}</span></div>

                {fail && <p role="alert" className="co-err" style={{ marginTop: 14 }}>{friendly(fail)}</p>}
                <button className="s-btn full" type="submit" disabled={placing || !payOptions.length} style={{ marginTop: 16 }}>
                  {placing ? 'Preparing…' : payment === 'online' ? `Pay ${fmtINR(total)} securely` : `Place Order — ${fmtINR(total)}`}
                </button>
                <p className="co-secure">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
                  Secure checkout — your payment information is encrypted and protected.
                </p>
              </aside>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
