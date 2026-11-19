// Thin API client. In dev, Vite proxies /api -> the Node server (:4000).
// In prod, set VITE_API_URL to the deployed API base.
import type { Product, Order } from './types'

const BASE = import.meta.env.VITE_API_URL || ''

async function request<T>(path: string, init: RequestInit = {}, token?: string): Promise<T> {
  const headers: HeadersInit = { 'Content-Type': 'application/json', ...(init.headers as Record<string, string>) }
  if (token) (headers as Record<string, string>).Authorization = `Bearer ${token}`
  const res = await fetch(`${BASE}/api${path}`, { ...init, headers })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error((body as { error?: string }).error || `Request failed (${res.status})`)
  return body as T
}

export const api = {
  // catalog
  getProducts: (filter?: { technique?: string; q?: string }) => {
    const qs = new URLSearchParams()
    if (filter?.technique) qs.set('technique', filter.technique)
    if (filter?.q) qs.set('q', filter.q)
    const s = qs.toString()
    return request<{ products: Product[] }>(`/products${s ? `?${s}` : ''}`)
  },
  getProduct: (slug: string) => request<{ product: Product }>(`/products/${slug}`),

  // orders
  confirmOrder: (orderNo: string) => request<{ order: Order }>(`/orders/${orderNo}`),

  // auth
  exchangeCode: (email: string, code: string) =>
    request<{ token: string; user: { id: string; email: string; name?: string } }>('/auth/verify-code', {
      method: 'POST',
      body: JSON.stringify({ email, code }),
    }),
}

export const fmtINR = (n: number) => `₹${Number(n || 0).toLocaleString('en-IN')}`
