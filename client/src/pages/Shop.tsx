import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { api, fmtINR } from '../lib/api'
import type { Product, Technique } from '../lib/types'
import { seedProducts, TECHNIQUES } from '../data/seed'

const EASE = [0.2, 0.7, 0.2, 1] as const
const listVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } },
}
const cardVariants = {
  hidden: { opacity: 0, y: 22 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } },
}

type SortMode = 'feat' | 'low' | 'high'

export default function Shop() {
  const [params, setParams] = useSearchParams()
  const cat = (params.get('cat') as Technique | null) || ''
  const q = params.get('q') || ''
  const [sort, setSort] = useState<SortMode>('feat')
  const nav = useNavigate()
  const [all, setAll] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    api.getProducts({ technique: cat, q: q || undefined })
      .then(({ products }) => setAll(products))
      .catch(() => setAll(seedProducts))
      .finally(() => setLoading(false))
  }, [cat, q])

  const filtered = useMemo(() => {
    let list = all.filter(
      (p) =>
        p.published !== false &&
        (!cat || p.technique === cat) &&
        (!q ||
          p.name.toLowerCase().includes(q.toLowerCase()) ||
          p.technique.toLowerCase().includes(q.toLowerCase())),
    )
    if (sort === 'low') list = [...list].sort((a, b) => a.price - b.price)
    if (sort === 'high') list = [...list].sort((a, b) => b.price - a.price)
    return list
  }, [all, cat, q, sort])

  const setCat = (c: string) => setParams(c ? { cat: c } : {}, { replace: true })
  const onKeyNav = (e: React.KeyboardEvent, slug: string) => {
    if (e.key === 'Enter') nav(`/shop/${slug}`)
  }

  return (
    <div className="page shop-page">
      {/* dark-vignette banner, image behind the heading */}
      <section className="shop-hero" aria-label="The collection">
        <div className="shop-hero-bg" aria-hidden="true">
          <img
            src="/images/hq/maroon-still-1774.webp"
            srcSet="/images/hq/maroon-still-1000.webp 1000w, /images/hq/maroon-still-1774.webp 1774w"
            sizes="100vw"
            alt=""
          />
        </div>
        <div className="wrap">
          <span className="kicker">THE COLLECTION</span>
          <h2 className="h-lg">Handmade Rugs &amp; Carpets</h2>
          <p className="lead">
            Each piece is woven to order in our workshop. Filter by technique, or search the collection.
          </p>
        </div>
      </section>

      {/* single-line toolbar: pills left, search right (stacks on mobile) */}
      <div className="shop-toolbar-wrap">
        <div className="shop-toolbar">
          <div className="chips filter-chips" role="group" aria-label="Filter by technique">
            <button type="button" className={`chip-pill ${!cat ? 'on' : ''}`} onClick={() => setCat('')}>All</button>
            {TECHNIQUES.map((t) => (
              <button key={t} type="button" className={`chip-pill ${cat === t ? 'on' : ''}`} onClick={() => setCat(t)}>
                {t}
              </button>
            ))}
          </div>
          <div className="shop-search-wrap">
            <svg className="si" viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.8-3.8" />
            </svg>
            <input
              className="shop-search"
              placeholder="Search rugs…"
              value={q}
              onChange={(e) => setParams(e.target.value ? { q: e.target.value } : {}, { replace: true })}
              aria-label="Search the collection"
            />
          </div>
        </div>
      </div>

      {/* grid — framer-motion stagger, re-runs on filter/search/sort change */}
      {loading ? (
        <p className="muted">Loading the collection…</p>
      ) : (
        <div className="grid-wrap">
          <div className="grid-meta">
            <span>{filtered.length} {filtered.length === 1 ? 'piece' : 'pieces'}</span>
            <select
              className="sort-sel"
              value={sort}
              onChange={(e) => setSort(e.target.value as SortMode)}
              aria-label="Sort products"
            >
              <option value="feat">Featured</option>
              <option value="low">Price: Low to High</option>
              <option value="high">Price: High to Low</option>
            </select>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={`${cat}|${q}|${sort}`}
              className="prod-grid"
              variants={listVariants}
              initial="hidden"
              animate="show"
              exit={{ opacity: 0, transition: { duration: 0.18 } }}
            >
              {filtered.length === 0 ? (
                <p className="muted" style={{ gridColumn: '1 / -1' }}>
                  No pieces match that filter yet — try another technique.
                </p>
              ) : (
                filtered.map((p) => (
                  <motion.div
                    key={p.id}
                    variants={cardVariants}
                    className="p-card"
                    role="link"
                    tabIndex={0}
                    onClick={() => nav(`/shop/${p.slug}`)}
                    onKeyDown={(e) => onKeyNav(e, p.slug)}
                    aria-label={`View ${p.name}`}
                  >
                    <div className="p-media">
                      <img className="main" src={p.image} alt={p.name} loading="lazy" />
                      {p.gallery?.[0] && <img className="alt" src={p.gallery[0]} alt="" loading="lazy" />}
                      {p.featured && <span className="p-tag">Featured</span>}
                    </div>
                    <div className="p-info">
                      <div className="p-cat">{p.technique}</div>
                      <h3>{p.name}</h3>
                      {p.blurb && <p className="p-desc">{p.blurb}</p>}
                      <div className="p-price">
                        <span className="from">From</span>
                        <b>{fmtINR(p.price)}</b>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}
