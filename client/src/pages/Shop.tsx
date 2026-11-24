import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { api, fmtINR } from '../lib/api'
import type { Product, Technique } from '../lib/types'
import { seedProducts, TECHNIQUES } from '../data/seed'
import { useCart } from '../context/CartContext'
import Lightbox, { type LbMedia } from '../components/Lightbox'

const EASE = [0.2, 0.7, 0.2, 1] as const
const listVariants = { hidden: {}, show: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } } }
const cardVariants = {
  hidden: { opacity: 0, y: 22 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } },
}

type SortMode = 'feat' | 'new' | 'low' | 'high'

export default function Shop() {
  const [params, setParams] = useSearchParams()
  const cat = (params.get('cat') as Technique | null) || ''
  const q = params.get('q') || ''
  const [sort, setSort] = useState<SortMode>('feat')
  const nav = useNavigate()
  const [all, setAll] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [wish, setWish] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('aruna-wishlist') || '[]') } catch { return [] }
  })
  const [lb, setLb] = useState<{ items: LbMedia[]; index: number } | null>(null)
  const { add } = useCart()

  useEffect(() => {
    api.getProducts({ technique: cat, q: q || undefined })
      .then(({ products }) => setAll(products))
      .catch(() => setAll(seedProducts))
      .finally(() => setLoading(false))
  }, [cat, q])

  const filtered = useMemo(() => {
    let list = all.filter((p) => p.published !== false)
    if (cat) list = list.filter((p) => p.technique === cat)
    if (q) list = list.filter((p) => p.name.toLowerCase().includes(q.toLowerCase()) || p.technique.toLowerCase().includes(q.toLowerCase()))
    if (sort === 'low') list = [...list].sort((a, b) => a.price - b.price)
    else if (sort === 'high') list = [...list].sort((a, b) => b.price - a.price)
    else if (sort === 'new') list = [...list].sort((a, b) => (b.tags?.includes('New Arrival') ? 1 : 0) - (a.tags?.includes('New Arrival') ? 1 : 0))
    return list
  }, [all, cat, q, sort])

  const setCat = (c: string) => setParams(c ? { cat: c } : {}, { replace: true })
  const toggleWish = (id: string) => setWish((w) => {
    const n = w.includes(id) ? w.filter((x) => x !== id) : [...w, id]
    try { localStorage.setItem('aruna-wishlist', JSON.stringify(n)) } catch { /* ignore */ }
    return n
  })

  return (
    <div className="page store shop-page">
      {/* dark-vignette banner, image behind the heading — same as earlier */}
      <section className="shop-hero" aria-label="The collection">
        <div className="shop-hero-bg" aria-hidden="true">
          <img src="/images/hq/maroon-still-1774.webp" srcSet="/images/hq/maroon-still-1000.webp 1000w, /images/hq/maroon-still-1774.webp 1774w" sizes="100vw" alt="" />
        </div>
        <div className="wrap">
          <span className="kicker">THE COLLECTION</span>
          <h2 className="h-lg">Handmade Rugs &amp; Carpets</h2>
          <p className="lead">Each piece is woven to order in our workshop. Filter by technique, or search the collection.</p>
        </div>
      </section>

      {/* single-line toolbar: pills left, search + sort right — same as earlier */}
      <div className="shop-toolbar-wrap">
        <div className="shop-toolbar">
          <div className="chips filter-chips" role="group" aria-label="Filter by technique">
            <button type="button" className={`chip-pill ${!cat ? 'on' : ''}`} onClick={() => setCat('')}>All</button>
            {TECHNIQUES.map((t) => (
              <button key={t} type="button" className={`chip-pill ${cat === t ? 'on' : ''}`} onClick={() => setCat(t)}>{t}</button>
            ))}
          </div>
          <div className="shop-toolbar-right">
            <div className="shop-search-wrap">
              <svg className="si" viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round">
                <circle cx="11" cy="11" r="7" /><path d="m20 20-3.8-3.8" />
              </svg>
              <input className="shop-search" placeholder="Search rugs…" value={q}
                onChange={(e) => setParams(e.target.value ? { q: e.target.value } : {}, { replace: true })} aria-label="Search the collection" />
            </div>
            <select className="sort-sel" value={sort} onChange={(e) => setSort(e.target.value as SortMode)} aria-label="Sort products">
              <option value="feat">Featured</option>
              <option value="new">Newest</option>
              <option value="low">Price: Low to High</option>
              <option value="high">Price: High to Low</option>
            </select>
          </div>
        </div>
      </div>

      {/* grid */}
      <div className="grid-wrap">
        <p className="shop-count" style={{ color: 'var(--ink-soft)', fontSize: 13, marginBottom: 6 }}>{filtered.length} {filtered.length === 1 ? 'piece' : 'pieces'}</p>
        {loading ? (
          <p className="muted">Loading the collection…</p>
        ) : filtered.length === 0 ? (
          <p className="muted" style={{ padding: '60px 0' }}>No pieces match that filter yet — try another technique.</p>
        ) : (
          <AnimatePresence mode="wait">
              <motion.div key={`${cat}|${q}|${sort}`} className="prod-grid" variants={listVariants} initial="hidden" animate="show" exit={{ opacity: 0, transition: { duration: 0.18 } }}>
                {filtered.map((p) => (
                  <motion.div key={p.id} variants={cardVariants} className="pcard" role="link" tabIndex={0}
                    onClick={() => nav(`/shop/${p.slug}`)} onKeyDown={(e) => e.key === 'Enter' && nav(`/shop/${p.slug}`)} aria-label={`View ${p.name}`}>
                    <div className="pcard-media">
                      <img className="main" src={p.image} alt={p.name} loading="lazy" />
                      {p.tags?.[0] && <span className={`pcard-tag badge ${p.tags[0] === 'New Arrival' ? 'amber' : ''}`}>{p.tags[0]}</span>}
                      <button className={`pcard-wish ${wish.includes(p.id) ? 'on' : ''}`} aria-label="Save to wishlist"
                        onClick={(e) => { e.stopPropagation(); toggleWish(p.id) }}>
                        <svg width="17" height="17" viewBox="0 0 24 24"><path d="M12 21s-7-4.5-9.5-9C1 8.5 2.5 5 6 5c2 0 3.5 1.5 6 4 2.5-2.5 4.5-4 6.5-4 3.5 0 4.5 3.5 3.5 7-2.5 4.5-10 9-10 9z" /></svg>
                      </button>
                    </div>
                    <div className="pcard-body">
                      <div className="p-cat">{p.technique}</div>
                      <div className="nm">{p.name}</div>
                      {p.collection && <div className="sub">{p.collection}</div>}
                      <div className="pcard-price"><span className="from">From</span>{fmtINR(p.price)}</div>
                      {p.colours?.length ? (
                        <div className="pcard-swatches">{p.colours.slice(0, 4).map((c) => <i key={c.name} style={{ background: c.hex }} title={c.name} />)}</div>
                      ) : null}
                      <button className="pcard-quick" onClick={(e) => { e.stopPropagation(); add(p) }}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4zM3 6h18M16 10a4 4 0 0 1-8 0" /></svg>
                        Quick Add
                      </button>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            </AnimatePresence>
        )}
      </div>

      {lb && <Lightbox items={lb.items} index={lb.index} onIndex={(i) => setLb((s) => (s ? { ...s, index: i } : s))} onClose={() => setLb(null)} />}
    </div>
  )
}
