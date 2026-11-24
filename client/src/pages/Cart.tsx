import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { fmtINR } from '../lib/api'
import { findCoupon, couponDiscount } from '../lib/coupons'
import { storeConfig, DEFAULT_STORE } from '../lib/storeConfig'
import type { CartItem } from '../lib/types'

const SAVED_KEY = 'aruna-saved-items'

const loadSaved = (): CartItem[] => {
  try { return JSON.parse(sessionStorage.getItem(SAVED_KEY) || '[]') } catch { return [] }
}

export default function Cart() {
  const { items, subtotal, setQty, remove, add } = useCart()
  const nav = useNavigate()
  const [coupon, setCoupon] = useState('')
  const [applied, setApplied] = useState<{ code: string } | null>(null)
  const [saved, setSaved] = useState<CartItem[]>(loadSaved)
  const [couponMsg, setCouponMsg] = useState<{ text: string; err?: boolean } | null>(null)
  const [ship, setShip] = useState(DEFAULT_STORE)

  useEffect(() => { storeConfig().then(setShip) }, [])
  useEffect(() => {
    try { sessionStorage.setItem(SAVED_KEY, JSON.stringify(saved)) } catch { /* ignore */ }
  }, [saved])

  const discount = applied ? couponDiscount(findCoupon(applied.code), subtotal) : 0
  const shipping = ship.freeShippingAbove > 0 && subtotal >= ship.freeShippingAbove ? 0 : ship.flatShipping
  const total = Math.max(0, subtotal - discount + shipping)

  const applyCoupon = () => {
    if (!coupon.trim()) return
    const c = findCoupon(coupon)
    if (c) {
      setApplied({ code: c.code })
      setCouponMsg({ text: `Coupon applied! You saved ${fmtINR(couponDiscount(c, subtotal))}.` })
    } else {
      setCouponMsg({ text: `“${coupon.trim().toUpperCase()}” isn’t a valid code.`, err: true })
    }
  }

  const keyOf = (i: CartItem) => `${i.product.id}|${i.size ?? ''}`
  const saveForLater = (id: string, size?: string) => {
    const item = items.find((i) => i.product.id === id && i.size === size)
    if (!item) return
    remove(id, size)
    setSaved((s) => [...s.filter((x) => keyOf(x) !== keyOf(item)), item])
  }
  const moveToCart = (item: CartItem) => {
    add(item.product, item.qty, item.size)
    setSaved((s) => s.filter((x) => keyOf(x) !== keyOf(item)))
  }

  // estimate delivery 4–7 days out
  const etd = (() => {
    const a = new Date(); const b = new Date(); b.setDate(b.getDate() + 7)
    const f = (d: Date) => d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    return `${f(a)} – ${f(b)}`
  })()

  const empty = items.length === 0

  return (
    <div className="page store">
      <div className="wrap cart-page">
        <div className="cart-head">
          <h1>Your Shopping Bag <span className="n">({items.length} item{items.length === 1 ? '' : 's'})</span></h1>
          <Link to="/shop">← Continue Shopping</Link>
        </div>

        {empty && saved.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <p className="muted">Your bag is empty.</p>
            <Link to="/shop" className="s-btn" style={{ marginTop: 20 }}>Explore the collection</Link>
          </div>
        ) : (
          <div className="cart-layout">
            <div className="cart-lines">
              {items.map((i) => (
                <div key={`${i.product.id}|${i.size ?? ''}`} className="cart-line">
                  <img src={i.product.image} alt={i.product.name} />
                  <div className="cl-info">
                    <b>{i.product.name}</b>
                    <div className="meta">{i.size ? `Size: ${i.size}` : `Colour: ${i.product.technique}`}</div>
                    <div className="cl-row">
                      <div className="cl-qty">
                        <button onClick={() => setQty(i.product.id, i.qty - 1, i.size)} aria-label="Decrease">–</button>
                        <span className="num">{i.qty}</span>
                        <button onClick={() => setQty(i.product.id, i.qty + 1, i.size)} aria-label="Increase">+</button>
                      </div>
                      <button className="cl-rm" onClick={() => remove(i.product.id, i.size)} aria-label="Remove">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m2 0v14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V6" /></svg>
                      </button>
                      <button className="save" onClick={() => saveForLater(i.product.id, i.size)}>Save for Later</button>
                    </div>
                  </div>
                  <div className="cl-right">
                    <span className="price num">{fmtINR(i.product.price * i.qty)}</span>
                  </div>
                </div>
              ))}

              {saved.length > 0 && (
                <div className="cart-lines" style={{ marginTop: 26, opacity: .85 }}>
                  <p className="store-eyebrow">Saved for later</p>
                  {saved.map((s, idx) => (
                    <div key={idx} className="cart-line" style={{ opacity: .6 }}>
                      <img src={s.product.image} alt="" style={{ filter: 'grayscale(1)' }} />
                      <div className="cl-info"><b>{s.product.name}</b><div className="meta">{s.size ? `Size: ${s.size}` : s.product.technique}</div></div>
                      <button className="s-btn ghost sm" onClick={() => moveToCart(s)}>Move to Bag</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* order summary */}
            <aside className="cart-summary">
              <h3>Order Summary</h3>
              <div className="sum-line"><span>Subtotal ({items.length} items)</span><span className="num">{fmtINR(subtotal)}</span></div>
              {discount > 0 && <div className="sum-line discount"><span>Discount ({applied?.code})</span><span className="num">− {fmtINR(discount)}</span></div>}
              <div className="sum-line"><span>Shipping</span><span className="num">{shipping === 0 ? 'Free' : fmtINR(shipping)}</span></div>
              <div className="sum-line total"><span>Total</span><span className="num">{fmtINR(total)}</span></div>

              <div className="coupon-row">
                <input value={coupon} onChange={(e) => setCoupon(e.target.value)} placeholder="Have a coupon code?" aria-label="Coupon code" />
                <button className="s-btn sm" onClick={applyCoupon} disabled={!coupon.trim()}>Apply</button>
              </div>
              {couponMsg && <div className={`coupon-msg ${couponMsg.err ? 'err' : ''}`}>{couponMsg.text}</div>}

              <button className="s-btn full" onClick={() => { if (applied) sessionStorage.setItem('aruna-coupon', applied.code); nav('/checkout') }}>
                Proceed to Checkout <span className="arrow">→</span>
              </button>

              <div className="cart-notes">
                {ship.freeShippingAbove > 0 ? (
                  <div className="cart-note">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M1 3h15v13H1zM16 8h4l3 3v5h-7z" /><circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" /></svg>
                    <span>{subtotal >= ship.freeShippingAbove ? 'You’ve unlocked free shipping on this order.' : <>Free shipping on orders above {fmtINR(ship.freeShippingAbove)}. Add <b>{fmtINR(ship.freeShippingAbove - subtotal)}</b> more to get free shipping.</>}</span>
                  </div>
                ) : null}
                <div className="cart-note">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>
                  <span><b>Estimated Delivery</b><br />{etd}</span>
                </div>
              </div>
            </aside>
          </div>
        )}
      </div>
    </div>
  )
}
