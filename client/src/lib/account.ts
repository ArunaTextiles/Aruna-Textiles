// Account / order-history data. Reads the signed-in customer's own orders straight from
// Supabase (RLS restricts it to user_id = auth.uid()); falls back to the last order stored
// in the session so the screens still render even when the database is slow.
import { hasSupabase, supabase } from './supabase'
import type { Order } from './types'

const SESSION_KEY = 'aruna-last-order'

/**
 * Kridhya fallback: create the order directly in the database when the order service
 * (API) is unreachable. Runs create_order (security definer) via the anon key; for COD
 * this is a real, trackable order the team confirms — no payment is taken.
 * Returns the order number.
 */
export async function placeOrderDirect(input: {
  customer: { name: string; email: string; phone: string }
  address: Record<string, string>
  items: { slug: string; size?: string; qty: number }[]
  note: string
  payment: 'cod' | 'online'
  shipping: number
  discount: number
  coupon?: string
  userId?: string
}): Promise<string> {
  const sb = supabase()
  const { data, error } = await sb.rpc('create_order', {
    p: {
      customer: input.customer,
      address: input.address,
      items: input.items,
      note: input.note,
      payment: input.payment,
      shipping: input.shipping,
      discount: input.discount,
      coupon: input.coupon || null,
    },
  })
  if (error) throw new Error(error.message)
  // link to the signed-in customer so it shows under My Orders (same as the server does)
  if (input.userId && data?.id) {
    try {
      await sb.rpc('attach_order_user', { p_order: data.id, p_user: input.userId })
    } catch {
      /* non-fatal: the order still exists, it just won't be listed under the account */
    }
  }
  return data.order_no
}

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
  if (hasSupabase) {
    const { data, error } = await supabase()
      .from('orders')
      .select('id, order_no, status, payment_status, payment_method, customer, address, items, subtotal, shipping, total, coupon, courier, tracking_no, tracking_url, created_at')
      .order('created_at', { ascending: false })
      .limit(50)
    if (!error) {
      // DB is the source of truth — only surface session orders when the DB can't be reached
      const rows = (data || []) as Record<string, unknown>[]
      return rows.map(mapRow)
    }
  }
  const session = lastSessionOrder()
  return session ? [session] : []
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
