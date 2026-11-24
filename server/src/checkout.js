// Checkout + order business logic. Runs on the server: prices and stock come from the database
// (never from the browser), shipping is computed here, and Razorpay orders are created server-side.
import { config, paymentsLive } from './config.js'
import { addEvent, getOrder, insert, rpc, select, update } from './db.js'
import { capturePayment, createRazorpayOrder, fetchPayment, verifyCheckoutSignature } from './razorpay.js'
import { notify } from './email.js'

export class UserError extends Error {
  constructor(message, status = 400) {
    super(message)
    this.status = status
  }
}

const cleanItems = (items) =>
  (Array.isArray(items) ? items : [])
    .slice(0, 50)
    .map((i) => ({
      slug: String(i.slug || i.productSlug || ''),
      size: i.size ? String(i.size) : undefined,
      qty: Math.max(1, Math.min(50, parseInt(i.qty, 10) || 1)),
    }))
    .filter((i) => i.slug)

/** Subtotal from database prices (never from the browser). */
async function priceBag(items) {
  const slugs = [...new Set(items.map((i) => i.slug))]
  if (!slugs.length) throw new UserError('Your bag is empty.')
  const rows = await select(`products?select=slug,data&slug=in.(${slugs.map((s) => `"${s.replace(/"/g, '')}"`).join(',')})`)
  const bySlug = Object.fromEntries(rows.map((r) => [r.slug, r.data]))
  let subtotal = 0
  let units = 0
  for (const i of items) {
    const p = bySlug[i.slug]
    if (!p) throw new UserError('An item in your bag is no longer available. Please remove it and try again.')
    subtotal += i.qty * Number(p.price || 0)
    units += i.qty
  }
  return { subtotal, units }
}

/** Shipping: flat fee, free above the threshold. (Shiprocket plugs in later — see config.shipping.) */
export async function quote({ items, pincode, payment = 'online' }) {
  const bag = cleanItems(items)
  if (!/^\d{6}$/.test(String(pincode || ''))) throw new UserError('Enter a valid 6-digit PIN code.')
  const { subtotal, units } = await priceBag(bag)
  const s = config.shipping
  const cod = payment === 'cod'
  const free = s.freeAbove > 0 && subtotal >= s.freeAbove
  const codFee = cod && s.codEnabled ? s.codFee : 0
  const shipping = free ? 0 : s.flatFee + codFee
  return {
    serviceable: true,
    subtotal,
    units,
    shipping,
    total: subtotal + shipping,
    free,
    codAvailable: s.codEnabled,
    onlineAvailable: paymentsLive(),
    source: 'flat',
  }
}

/** Resolve a storefront coupon to a ₹ discount for a given subtotal (server-authoritative). */
export function resolveCoupon(code, subtotal) {
  const c = (config.coupons || []).find((x) => x.code === String(code || '').toUpperCase().trim())
  if (!c || (c.minOrder > 0 && subtotal < c.minOrder)) return { code: null, discount: 0 }
  const discount = c.kind === 'percent' ? Math.round((subtotal * c.value) / 100) : c.value
  return { code: c.code, discount: Math.min(discount, subtotal) }
}

/** Create the order. Online: also creates the Razorpay order for the payment window. */
export async function createCheckout(body, user = null) {
  const payment = body.payment === 'cod' ? 'cod' : 'online'
  if (payment === 'online' && !paymentsLive()) {
    throw new UserError('Online payment is not configured. Please choose Cash on Delivery.')
  }
  const items = cleanItems(body.items)
  const address = {
    line1: String(body.address?.line1 || '').trim(),
    line2: String(body.address?.line2 || '').trim(),
    city: String(body.address?.city || '').trim(),
    state: String(body.address?.state || '').trim(),
    pin: String(body.address?.pin || '').trim(),
  }

  await rpc('expire_unpaid_orders', { p_minutes: config.unpaidHoldMinutes }).catch(() => {})
  const q = await quote({ items, pincode: address.pin, payment })
  if (!q.serviceable) throw new UserError(q.message)
  const { code: coupon, discount } = resolveCoupon(body.coupon, q.subtotal)

  // Server-side order creation: prices from the DB, stock decremented atomically.
  const order = await rpc('create_order', {
    p: {
      customer: {
        name: String(body.customer?.name || ''),
        email: String(body.customer?.email || ''),
        phone: String(body.customer?.phone || ''),
      },
      address,
      items,
      note: String(body.note || ''),
      payment,
      shipping: q.shipping,
      discount,
      coupon,
    },
  }).catch((e) => {
    throw new UserError(e.message || 'Could not create the order.')
  })

  // Link to the signed-in customer (My Account > orders)
  if (user?.id) await rpc('attach_order_user', { p_order: order.id, p_user: user.id }).catch(() => {})

  if (payment === 'cod') {
    await notify('confirmed', await getOrder(`id=eq.${order.id}`))
    return { orderNo: order.order_no, total: order.total, discount: order.discount || 0, coupon: order.coupon || null, payment }
  }

  try {
    const rz = await createRazorpayOrder({ amountRupees: order.total, receipt: order.order_no, notes: { order_no: order.order_no } })
    await update('orders', `id=eq.${order.id}`, { razorpay_order_id: rz.id })
    return {
      orderNo: order.order_no,
      total: order.total,
      payment,
      razorpayOrder: {
        key: config.razorpay.keyId,
        orderId: rz.id,
        amount: rz.amount,
        currency: rz.currency,
        orderNo: order.order_no,
        customer: body.customer,
      },
    }
  } catch (e) {
    await rpc('server_set_order_status', { p_order: order.id, p_status: 'cancelled', p_note: `Could not start payment: ${e.message}` }).catch(() => {})
    throw new UserError('We could not start the payment just now. Please try again in a moment.', 502)
  }
}

/**
 * Confirm an online payment (checkout callback OR the webhook, which passes verified=true).
 * Checks signature + ownership + amount, then marks the order paid.
 */
export async function confirmPayment({ razorpay_order_id: orderId, razorpay_payment_id: paymentId, razorpay_signature: signature }, { verified = false } = {}) {
  if (!orderId || !paymentId) throw new UserError('Missing payment details.')
  if (!verified && !verifyCheckoutSignature(orderId, paymentId, signature)) {
    throw new UserError('We could not verify this payment. If money was deducted, contact us with your order number.')
  }
  let pay = await fetchPayment(paymentId)
  if (pay.order_id !== orderId) throw new UserError('This payment does not belong to the order.')
  if (pay.status === 'authorized') pay = await capturePayment(paymentId, pay.amount)
  if (pay.status !== 'captured') throw new UserError(`Payment not completed (status: ${pay.status}).`)

  const res = await rpc('mark_order_paid', { p_razorpay_order: orderId, p_payment_id: paymentId, p_amount_paise: Number(pay.amount) })
  if (!res.already && !res.late) {
    await notify('confirmed', await getOrder(`id=eq.${res.id}`))
  }
  return { orderNo: res.order_no, late: !!res.late }
}

/** A failed attempt (Razorpay payment.failed webhook). Order stays open for retry until it expires. */
export async function recordFailure(entity) {
  const before = await getOrder(`razorpay_order_id=eq.${encodeURIComponent(entity.order_id)}`)
  if (!before || before.payment_status !== 'pending') return
  await rpc('record_payment_failure', { p_razorpay_order: entity.order_id, p_payment_id: entity.id, p_error: entity.error_description || entity.error_reason || 'Payment failed' })
  if (before.payment_attempts === 0) await notify('payment_failed', before)
}

/** Retry payment on the customer's own unpaid order (My Account). Reuses the same Razorpay order. */
export async function retryPayment(orderNo, user) {
  if (!user?.id) throw new UserError('Please sign in again.', 401)
  if (!paymentsLive()) throw new UserError('Online payment is not configured.')
  await rpc('expire_unpaid_orders', { p_minutes: config.unpaidHoldMinutes }).catch(() => {})
  const o = await getOrder(`order_no=eq.${encodeURIComponent(orderNo)}&user_id=eq.${user.id}`)
  if (!o) throw new UserError('Order not found.', 404)
  if (o.status !== 'awaiting_payment' || !o.razorpay_order_id) {
    throw new UserError(o.payment_status === 'paid' ? 'This order is already paid.' : 'This order can no longer be paid — it expired. Please place it again.')
  }
  return {
    orderNo: o.order_no,
    total: o.total,
    payment: 'online',
    razorpayOrder: {
      key: config.razorpay.keyId,
      orderId: o.razorpay_order_id,
      amount: o.total * 100,
      currency: 'INR',
      orderNo: o.order_no,
      customer: o.customer,
    },
  }
}

// Shiprocket placeholder — returns skipped until the integration is confirmed and wired up.
export async function pushToShiprocket(_orderId) {
  return { skipped: true, reason: 'Shiprocket not configured' }
}
