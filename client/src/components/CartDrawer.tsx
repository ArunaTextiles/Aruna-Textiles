import { Link } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { fmtINR } from '../lib/api'

export default function CartDrawer() {
  const { items, count, subtotal, open, setOpen, setQty, remove } = useCart()
  return (
    <>
      <div className={`scrim ${open ? 'on' : ''}`} onClick={() => setOpen(false)} />
      <aside className={`cart ${open ? 'open' : ''}`} aria-hidden={!open} aria-label="Your cart">
        <header className="cart-top">
          <h3>Your Cart{count ? ` (${count})` : ''}</h3>
          <button onClick={() => setOpen(false)} aria-label="Close cart">×</button>
        </header>

        {items.length === 0 ? (
          <div className="cart-empty">
            <p>Your cart is empty.</p>
            <Link className="btn" to="/shop" onClick={() => setOpen(false)}>Browse the collection</Link>
          </div>
        ) : (
          <>
            <ul className="cart-list">
              {items.map((i, k) => (
                <li key={`${i.product.id}-${i.size ?? ''}-${k}`} className="cart-item">
                  <img src={i.product.image} alt={i.product.name} />
                  <div className="ci-mid">
                    <b>{i.product.name}</b>
                    <span>{i.product.technique}{i.size ? ` · ${i.size}` : ''}</span>
                    <button className="ci-remove" onClick={() => remove(i.product.id, i.size)}>Remove</button>
                  </div>
                  <div className="ci-right">
                    <div className="qty">
                      <button onClick={() => setQty(i.product.id, i.qty - 1, i.size)} aria-label="Decrease">–</button>
                      <span>{i.qty}</span>
                      <button onClick={() => setQty(i.product.id, i.qty + 1, i.size)} aria-label="Increase">+</button>
                    </div>
                    <em>{fmtINR(i.product.price * i.qty)}</em>
                  </div>
                </li>
              ))}
            </ul>
            <footer className="cart-foot">
              <div className="cf-row"><span>Subtotal</span><b>{fmtINR(subtotal)}</b></div>
              <p className="cf-note">Shipping &amp; taxes calculated at checkout.</p>
              <div style={{ display: 'grid', gap: 8 }}>
                <Link className="btn" to="/checkout" onClick={() => setOpen(false)}>Proceed to Checkout</Link>
                <Link to="/cart" onClick={() => setOpen(false)} style={{ fontSize: 12, color: 'var(--ink-soft)', textAlign: 'center', display: 'block' }}>View full bag</Link>
              </div>
            </footer>
          </>
        )}
      </aside>
    </>
  )
}
