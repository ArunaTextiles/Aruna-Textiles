import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api, fmtINR } from '../lib/api'
import { seedProducts } from '../data/seed'
import { useCart } from '../context/CartContext'
import Reveal from '../components/Reveal'

export default function Product() {
  const { slug } = useParams<{ slug: string }>()
  const [p, setP] = useState<(typeof seedProducts)[number] | null>(null)
  const [imgIdx, setImgIdx] = useState(0)
  const [qty, setQty] = useState(1)
  const [added, setAdded] = useState(false)
  const { add, setOpen } = useCart()

  useEffect(() => {
    const found = seedProducts.find((x) => x.slug === slug)
    api.getProduct(slug || '')
      .then(({ product }) => setP(product as never))
      .catch(() => setP(found || null))
    setImgIdx(0)
    setQty(1)
  }, [slug])

  if (!p) return <div className="page"><div className="wrap"><p className="muted">This piece isn’t in the collection yet. <Link to="/shop">Back to the shop</Link></p></div></div>

  const imgs = [p.image, ...(p.gallery || [])]
  const doAdd = () => {
    add(p, qty)
    setAdded(true)
    setTimeout(() => setAdded(false), 900)
  }

  return (
    <div className="page product-page">
      {/* dark-vignette banner, same treatment as the collection page */}
      <section className="shop-hero" aria-label={p.name}>
        <div className="shop-hero-bg" aria-hidden="true">
          <img src={imgs[0]} alt="" />
        </div>
        <div className="wrap">
          <Link to="/shop" className="back">← All collections</Link>
          <span className="kicker">{p.technique} · Made to Order</span>
          <h2 className="h-lg">{p.name}</h2>
        </div>
      </section>

      <div className="wrap">
        <div className="pd">
          <div className="pd-imgs">
            <Reveal className="zoom pd-main rv-img"><img src={imgs[imgIdx]} alt={p.name} /></Reveal>
            {imgs.length > 1 && (
              <div className="pd-thumbs">
                {imgs.map((src, i) => (
                  <button key={i} className={i === imgIdx ? 'on' : ''} onClick={() => setImgIdx(i)}>
                    <img src={src} alt={`${p.name} view ${i + 1}`} />
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="pd-info">
            <div className="pd-price">{fmtINR(p.price)}</div>
            <p className="pd-desc">{p.description || p.blurb || 'Woven to order in our Babail workshop. Choose a quantity, or start a custom order for your own size and colours.'}</p>
            <div className="pd-row">
              <div className="pd-qty">
                <button onClick={() => setQty((n) => Math.max(1, n - 1))} aria-label="Decrease">–</button>
                <span>{qty}</span>
                <button onClick={() => setQty((n) => n + 1)} aria-label="Increase">+</button>
              </div>
              <button className="btn" onClick={doAdd}>{added ? 'Added ✓' : 'Add to Cart'}</button>
              <button className="btn" style={{ background: 'transparent', color: 'var(--ink)', borderColor: 'var(--line)' }} onClick={() => setOpen(true)}>
                View Cart
              </button>
            </div>
            <p className="muted" style={{ marginTop: 22, fontSize: 13 }}>
              Made to order · 4–8 weeks · Worldwide shipping · <Link to="/#custom">Customize this piece →</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
