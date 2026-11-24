import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api, fmtINR } from '../lib/api'
import type { Product } from '../lib/types'
import { seedProducts } from '../data/seed'
import { cachedProduct, saveProduct } from '../lib/cache'
import { useCart } from '../context/CartContext'
import Lightbox from '../components/Lightbox'

const Trust = ({ children, label, sub }: { children: React.ReactNode; label: string; sub: string }) => (
  <div>
    {children}
    <b>{label}</b>
    <small>{sub}</small>
  </div>
)

export default function ProductPage() {
  const { slug } = useParams<{ slug: string }>()
  const [p, setP] = useState<Product | null>(null)
  const [imgIdx, setImgIdx] = useState(0)
  const [size, setSize] = useState(0)
  const [colour, setColour] = useState(0)
  const [qty, setQty] = useState(1)
  const [added, setAdded] = useState(false)
  const [wish, setWish] = useState(false)
  const [tab, setTab] = useState<'desc' | 'craft' | 'specs' | 'care' | 'ship'>('desc')
  const [lb, setLb] = useState(false)
  const nav = useNavigate()
  const { add, setOpen } = useCart()

  useEffect(() => {
    // serve from cache instantly (if we have it), then refresh from the API in the background
    const cached = cachedProduct(slug || '')
    const found = seedProducts.find((x) => x.slug === slug)
    setP(cached || found || null)
    setImgIdx(0); setSize(0); setColour(0); setQty(1); setTab('desc')

    if (!slug) return
    api.getProduct(slug)
      .then(({ product }) => { saveProduct(slug, product); setP(product as Product) })
      .catch(() => setP(cached || found || null)) // offline → keep the cached/seed copy
  }, [slug])

  const imgs = useMemo(() => (p ? [p.image, ...(p.gallery || [])] : []), [p])

  if (!p)
    return (
      <div className="page store"><div className="wrap">
        <p className="muted">This piece isn’t in the collection yet. <Link to="/shop">Back to the shop</Link></p>
      </div></div>
    )

  const price = p.sizes?.[size]?.price ?? p.price
  const toggleWish = () => setWish((w) => {
    const n = !w
    const all = JSON.parse(localStorage.getItem('aruna-wishlist') || '[]')
    const list = n ? Array.from(new Set([...all, p.id])) : all.filter((x) => x !== p.id)
    try { localStorage.setItem('aruna-wishlist', JSON.stringify(list)) } catch { /* ignore */ }
    return n
  })
  const doAdd = () => { add(p, qty, p.sizes?.[size]?.label); setAdded(true); setTimeout(() => setAdded(false), 1200) }
  const buyNow = () => { add(p, qty, p.sizes?.[size]?.label); nav('/checkout') }

  const starIcon = <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="m12 2 3 6.5 7 .6-5.3 4.6 1.6 6.9L12 17l-5.9 3.6L7.7 13.7 2.4 9.1l7-.6z" /></svg>

  return (
    <div className="page store">
      <div className="wrap">
        <nav className="crumbs" aria-label="Breadcrumb">
          <Link to="/">Home</Link><span className="sep">/</span>
          <Link to="/shop">Rugs</Link><span className="sep">/</span>
          <span className="here">{p.name}</span>
        </nav>

        <div className="pdp">
          {/* media */}
          <div className="pdp-media">
            <div className="main">
              <img src={imgs[imgIdx]} alt={p.name} />
              <button className="zoom-btn" onClick={() => setLb(true)} aria-label="Zoom">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.8-3.8" /></svg>
              </button>
            </div>
            {imgs.length > 1 && (
              <div className="pdp-thumbs">
                {imgs.map((src, i) => (
                  <button key={i} className={i === imgIdx ? 'on' : ''} onClick={() => setImgIdx(i)} aria-label={`View ${i + 1}`}>
                    <img src={src} alt="" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* info */}
          <div className="pdp-info">
            <span className="p-sub">{p.collection} · {p.technique}</span>
            <h1 className="pdp-title">{p.name}</h1>
            {p.rating ? (
              <div className="pdp-rating">
                <span className="stars">{'★★★★★'.slice(0, Math.round(p.rating))}</span>
                <span>{p.rating} ({p.reviewCount} reviews)</span>
              </div>
            ) : null}
            <div className="pdp-price num">{fmtINR(price)}</div>
            <div className="pdp-tax">Inclusive of all taxes</div>
            <p className="pdp-desc">{p.description || p.blurb}</p>

            {p.sizes?.length ? (
              <>
                <p className="pdp-lead">Size</p>
                <div className="pdp-chips">
                  {p.sizes.map((s, i) => <button key={s.label} className={`pdp-chip ${i === size ? 'on' : ''}`} onClick={() => setSize(i)}>{s.label}</button>)}
                </div>
              </>
            ) : null}
            {p.colours?.length ? (
              <>
                <p className="pdp-lead">Colour: <span style={{ color: 'var(--ink)', textTransform: 'none', letterSpacing: 0 }}>{p.colours[colour]?.name}</span></p>
                <div className="pdp-swatches">
                  {p.colours.map((c, i) => <button key={c.name} className={`pdp-swatch ${i === colour ? 'on' : ''}`} style={{ background: c.hex }} onClick={() => setColour(i)} aria-label={c.name} />)}
                </div>
              </>
            ) : null}

            <p className="pdp-lead">Quantity</p>
            <div className="pdp-qty">
              <button onClick={() => setQty((n) => Math.max(1, n - 1))} aria-label="Decrease">–</button>
              <span className="num">{qty}</span>
              <button onClick={() => setQty((n) => n + 1)} aria-label="Increase">+</button>
            </div>

            <div className="pdp-cta">
              <div className="pdp-cta-row">
                <button className="cta-primary" onClick={doAdd}>
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4zM3 6h18M16 10a4 4 0 0 1-8 0" /></svg>
                  {added ? 'Added to Cart' : 'Add to Cart'}
                </button>
                <button className={`cta-icon ${wish ? 'on' : ''}`} onClick={toggleWish} aria-label="Save to wishlist" aria-pressed={wish}>
                  <svg viewBox="0 0 24 24"><path d="M12 21s-7-4.5-9.5-9C1 8.5 2.5 5 6 5c2 0 3.5 1.5 6 4 2.5-2.5 4.5-4 6.5-4 3.5 0 4.5 3.5 3.5 7-2.5 4.5-10 9-10 9z" /></svg>
                </button>
              </div>
              <button className="cta-buy" onClick={buyNow}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"><path d="M13 2 3 14h7l-1 8 10-12h-7z" /></svg>
                Buy Now
              </button>
              <button className="cta-view" onClick={() => setOpen(true)}>View your bag <span aria-hidden="true">→</span></button>
            </div>

            <div className="pdp-trust">
              <Trust label={`Handcrafted by ${p.technique} artisans`} sub="Ethically made">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" /></svg>
              </Trust>
              <Trust label="Premium Natural Fibres" sub="Wool & jute">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M12 2v20M2 12h20M5 5l14 14M19 5 5 19" /></svg>
              </Trust>
              <Trust label="Easy Care" sub="Machine washable">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M20 6 9 17l-5-5" /></svg>
              </Trust>
              <Trust label="Pan India Delivery" sub="Insured & tracked">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M1 3h15v13H1zM16 8h4l3 3v5h-7z" /><circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" /></svg>
              </Trust>
            </div>

            {/* tabs */}
            <div className="pdp-tabs">
              <div className="tabbar" role="tablist">
                {([['desc', 'Description'], ['craft', 'Craftsmanship'], ['specs', 'Specifications'], ['care', 'Care Instructions'], ['ship', 'Shipping & Returns']] as const).map(([k, l]) => (
                  <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)} role="tab" aria-selected={tab === k}>{l}</button>
                ))}
              </div>
              <div className="panel">
                {tab === 'desc' && (
                  <div className="pdp-craft">
                    <div>
                      <h4>The Craft Behind Our Rugs</h4>
                      <p>{p.description || p.blurb} From careful yarn selection to hand-tufting and finishing, each rug is created with skill, patience and attention to detail — a piece built to last for generations.</p>
                    </div>
                    <div className="imgs">
                      {(p.gallery?.length ? p.gallery : imgs.slice(1, 3)).slice(0, 2).map((g, i) => <img key={i} src={g} alt="" />)}
                    </div>
                  </div>
                )}
                {tab === 'craft' && (
                  <p>{p.technique} rugs from Aruna Textile are made by hand in our own workshop. Each piece goes through warping, tufting, trimming and surface finishing — techniques refined over decades. Made to order, your rug is woven to your size and colours and typically ships within 4–8 weeks.</p>
                )}
                {tab === 'specs' && (
                  <dl className="pdp-specs">
                    <div className="row"><dt>Technique</dt><dd>{p.technique}</dd></div>
                    <div className="row"><dt>Category</dt><dd>{p.category || 'Rugs'}</dd></div>
                    <div className="row"><dt>Material</dt><dd>Premium natural wool / jute</dd></div>
                    <div className="row"><dt>Available sizes</dt><dd>{p.sizes?.map((s) => s.label).join(', ') || 'Made to order'}</dd></div>
                    <div className="row"><dt>Colours</dt><dd>{p.colours?.map((c) => c.name).join(', ') || 'See images'}</dd></div>
                  </dl>
                )}
                {tab === 'care' && (
                  <ul className="pdp-list">
                    <li>Machine wash cold on a gentle cycle, or dry clean.</li>
                    <li>Blot spills promptly; avoid rubbing.</li>
                    <li>Rotate regularly to even out sun and wear.</li>
                    <li>Keep out of prolonged direct sunlight.</li>
                  </ul>
                )}
                {tab === 'ship' && (
                  <ul className="pdp-list">
                    <li>Free shipping on orders above ₹7,000.</li>
                    <li>Made-to-order pieces ship within 4–8 weeks.</li>
                    <li>30-day returns on unused items; custom pieces final sale.</li>
                    <li>Insured, tracked delivery across India.</li>
                  </ul>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {lb && <Lightbox items={imgs.map((img) => ({ img, alt: p.name }))} index={imgIdx} onIndex={setImgIdx} onClose={() => setLb(false)} />}
    </div>
  )
}
