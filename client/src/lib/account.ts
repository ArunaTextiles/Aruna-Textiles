// Account / order-history data. Reads the signed-in customer's own orders straight from
// Supabase (RLS restricts it to user_id = auth.uid()); falls back to the last order stored
// in the session so the screens still render even when the database is slow.
import { hasSupabase, supabase } from './supabase'
import type { Order } from './types'

const SESSION_KEY = 'aruna-last-order'

function mapRow(r: Record<string, unknown>): Order {
  const items = (r.items as Order['items']) || []
  return {
    id: String(r.id),
    orderNo: String(r.order_no),
    status: (r.status as Order['status']) || 'placed',
    paymentStatus: (r.payment_status as Order['paymentStatus']) || 'pending',
    paymentMethod: (r.payment_method as Order['paymentMethod']) || 'online',
    customer: (r.customer as Order['customer']) || { name: '', email: '', phone: '' },
    address: (r.address as Order['address']) || ({} as Order['address']),
    items,
    subtotal: Number(r.subtotal || 0),
    shipping: Number(r.shipping || 0),
    discount: Number(r.discount || 0),
    coupon: r.coupon ? String(r.coupon) : undefined,
    total: Number(r.total || 0),
    courier: r.courier ? String(r.courier) : undefined,
    trackingNo: r.tracking_no ? String(r.tracking_no) : undefined,
    trackingUrl: r.tracking_url ? String(r.tracking_url) : undefined,
    createdAt: String(r.created_at),
  }
}

/** A single order by its number (for the tracking page) — Supabase first, then session. */
export async function orderByNo(orderNo: string): Promise<Order | null> {
  if (hasSupabase) {
    const { data } = await supabase()
      .from('orders')
      .select('id, order_no, status, payment_status, payment_method, customer, address, items, subtotal, shipping, total, coupon, courier, tracking_no, tracking_url, created_at')
      .eq('order_no', orderNo)
      .limit(1)
    const row = data?.[0]
    if (row) return mapRow(row as Record<string, unknown>)
  }
  const all = await myOrders().catch(() => sessionOrders())
  return all.find((o) => o.orderNo === orderNo) || null
}

/** The customer's own orders, newest first (Supabase RLS scopes to the signed-in user). */
export async function myOrders(): Promise<Order[]> {
  if (!hasSupabase) return sessionOrders()
  const { data, error } = await supabase()
    .from('orders')
    .select('id, order_no, status, payment_status, payment_method, customer, address, items, subtotal, shipping, total, coupon, courier, tracking_no, tracking_url, created_at')
    .order('created_at', { ascending: false })
    .limit(50)
  if (error) throw new Error(error.message)
  const rows = (data || []) as Record<string, unknown>[]
  const mapped = rows.map(mapRow)
  // merge in the most recent session order if it isn't there yet (covers brand-new orders)
  const last = lastSessionOrder()
  if (last && !mapped.some((o) => o.orderNo === last.orderNo)) mapped.unshift(last)
  return mapped
}

export function lastSessionOrder(): Order | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY)
    return raw ? (JSON.parse(raw) as Order) : null
  } catch {
    return null
  }
}

export function rememberOrder(o: Order | null) {
  try {
    if (o) sessionStorage.setItem(SESSION_KEY, JSON.stringify(o))
  } catch {
    /* storage blocked — ignore */
  }
}

function sessionOrders(): Order[] {
  const o = lastSessionOrder()
  return o ? [o] : []
}

/** Access token for the signed-in user (for retry-payment calls). */
export async function accessToken() {
  if (!hasSupabase) return ''
  const { data } = await supabase().auth.getSession()
  return data.session?.access_token || ''
}
