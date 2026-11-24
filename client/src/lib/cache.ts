// Client-side product cache (localStorage). The shop catalog is small, so we cache the
// full list and filter client-side — no network round-trip on every visit or filter change.
// TTL keeps data reasonably fresh; background revalidation updates it when stale.
import type { Product } from './types'

const PRODUCTS_KEY = 'aruna:products'
const PRODUCT_KEY = (slug: string) => `aruna:product:${slug}`
const PRODUCTS_TTL = 5 * 60 * 1000 // refresh the catalog at most every 5 min

export interface CachedProducts {
  products: Product[]
  ts: number
}

export function cachedProducts(): CachedProducts | null {
  try {
    const raw = localStorage.getItem(PRODUCTS_KEY)
    if (!raw) return null
    const c = JSON.parse(raw) as CachedProducts
    if (!Array.isArray(c?.products)) return null
    return c
  } catch {
    return null
  }
}

export function saveProducts(products: Product[]) {
  try {
    localStorage.setItem(PRODUCTS_KEY, JSON.stringify({ products, ts: Date.now() }))
  } catch {
    /* storage full/blocked — browsing still works from network each time */
  }
}

/** True if the cached catalog is young enough to skip the network entirely. */
export function isProductsFresh(): boolean {
  const c = cachedProducts()
  return !!c && Date.now() - c.ts < PRODUCTS_TTL
}

export function cachedProduct(slug: string): Product | null {
  try {
    const raw = localStorage.getItem(PRODUCT_KEY(slug))
    if (!raw) return null
    const c = JSON.parse(raw) as { product: Product; ts: number }
    if (!c?.product?.slug) return null
    return c.product
  } catch {
    return null
  }
}

export function saveProduct(slug: string, product: Product) {
  try {
    localStorage.setItem(PRODUCT_KEY(slug), JSON.stringify({ product, ts: Date.now() }))
  } catch {
    /* ignore */
  }
}
