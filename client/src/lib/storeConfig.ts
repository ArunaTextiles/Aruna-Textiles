// Live store config (shipping fee + free-shipping threshold) from /api/store/config.
// Falls back to the storefront constants when the API is unreachable (preview mode),
// so displayed totals always match the server's charge when it's live.
import { fmtINR } from './api'

export interface StoreConfig {
  flatShipping: number
  freeShippingAbove: number
  cod: boolean
  onlinePayments: boolean
}

// mockup defaults (used as fallback when the API is down)
export const DEFAULT_STORE: StoreConfig = {
  flatShipping: 100,
  freeShippingAbove: 7000,
  cod: true,
  onlinePayments: true,
}

let cache: StoreConfig | null = null
let inFlight: Promise<StoreConfig> | null = null

export function storeConfig(): Promise<StoreConfig> {
  if (cache) return Promise.resolve(cache)
  if (inFlight) return inFlight
  inFlight = (async () => {
    try {
      const res = await fetch('/api/store/config', { signal: AbortSignal.timeout(8000) })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const b = await res.json()
      if (b?.ready && typeof b.flatShipping === 'number') {
        cache = {
          flatShipping: b.flatShipping,
          freeShippingAbove: Number(b.freeShippingAbove || 0),
          cod: !!b.cod,
          onlinePayments: !!b.onlinePayments,
        }
        return cache
      }
      return DEFAULT_STORE
    } catch {
      return DEFAULT_STORE // preview / API down: use the mockup numbers
    } finally {
      inFlight = null
    }
  })()
  return inFlight
}

export const money = fmtINR
