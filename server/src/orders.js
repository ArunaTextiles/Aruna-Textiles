// Admin order operations: stage changes (with customer emails), refunds.
// (Shiprocket courier actions are stubbed out until the integration is confirmed.)
import { addEvent, getOrder, insert, rpc, select, update } from './db.js'
import { notify } from './email.js'
import { createRefund } from './razorpay.js'

export class OrderError extends Error {
  constructor(message, status = 400) {
    super(message)
    this.status = status
  }
}

const FLOW = ['placed', 'confirmed', 'packed', 'shipped', 'out_for_delivery', 'delivered']
export const canMove = (from, to) => to === 'returned' || to === 'cancelled' || FLOW.indexOf(to) > FLOW.indexOf(from)
const EMAIL_ON = { shipped: 'shipped', out_for_delivery: 'out_for_delivery', delivered: 'delivered', cancelled: 'cancelled' }

/** Change an order's stage, then email the customer about it. */
export async function changeStatus(orderId, status, { note = '', courier, trackingNo, trackingUrl: url, actor } = {}) {
  const o = await getOrder(`id=eq.${encodeURIComponent(orderId)}`)
  if (!o) throw new OrderError('Order not found', 404)
  if (status === 'shipped' && !(courier || o.courier)) throw new OrderError('Add the courier name before marking the order as shipped.')
  const patch = {}
  if (courier) patch.courier = courier
  if (trackingNo) Object.assign(patch, { tracking_no: trackingNo, awb: o.awb || trackingNo })
  if (url) patch.tracking_url = url
  if (Object.keys(patch).length) await update('orders', `id=eq.${o.id}`, patch)

  const res = await rpc('server_set_order_status', { p_order: o.id, p_status: status, p_note: note ? `${note}${actor ? ` (${actor})` : ''}` : actor ? `by ${actor}` : null })
  if (res.from !== res.to && EMAIL_ON[status]) {
    const fresh = await getOrder(`id=eq.${o.id}`)
    await notify(EMAIL_ON[status], fresh)
  }
  return res
}

/** Refund all or part of an online payment through Razorpay. */
export async function refundOrder(orderId, { amount, reason = '', actor = 'admin' } = {}) {
  const o = await getOrder(`id=eq.${encodeURIComponent(orderId)}`)
  if (!o) throw new OrderError('Order not found', 404)
  if (o.payment_status === 'refunded') throw new OrderError('This order has already been fully refunded.')
  if (!o.razorpay_payment_id || !['paid'].includes(o.payment_status)) {
    throw new OrderError(o.payment_status === 'cod' ? 'This is a Cash on Delivery order — refund the customer directly and note it on the order.' : 'Only orders paid online can be refunded here.')
  }
  const pending = (await select(`refunds?order_id=eq.${o.id}&status=eq.pending&select=amount`)).reduce((n, r) => n + r.amount, 0)
  const refundable = o.total - (o.refunded_amount || 0) - pending
  const amt = amount == null || amount === '' ? refundable : Math.round(Number(amount))
  if (!(amt > 0)) throw new OrderError('Enter a refund amount above zero.')
  if (amt > refundable) throw new OrderError(`At most ₹${refundable.toLocaleString('en-IN')} can still be refunded on this order.`)

  const rz = await createRefund(o.razorpay_payment_id, { amountPaise: amt * 100, notes: { order_no: o.order_no, reason: reason.slice(0, 200) }, receipt: `${o.order_no}-R${Date.now().toString(36)}` })
  const status = rz.status === 'processed' ? 'processed' : rz.status === 'failed' ? 'failed' : 'pending'
  await insert('refunds', { order_id: o.id, razorpay_refund_id: rz.id, amount: amt, status, reason, created_by: actor }, { upsert: true })
  await rpc('apply_refund_status', { p_order: o.id }).catch(() => {})
  await addEvent(o.id, o.status, `Refund of ₹${amt} ${status === 'processed' ? 'processed' : 'started'} (${rz.id})${reason ? ` - ${reason}` : ''} by ${actor}`)
  return { refundId: rz.id, amount: amt, status }
}

export const refundable = async (o) => {
  const pending = (await select(`refunds?order_id=eq.${o.id}&status=eq.pending&select=amount`)).reduce((n, r) => n + r.amount, 0)
  return Math.max(0, o.total - (o.refunded_amount || 0) - pending)
}

/**
 * Pull the latest courier status for an order. Shiprocket is not wired up yet
 * (see config.shiprocketLive — always false), so this is a no-op today; the daily
 * cron calls it as a safety net. Fill in the real implementation when Shiprocket
 * is confirmed and switch config.shiprocketLive() on.
 */
export async function syncTracking(orderId) {
  void orderId
  return { status: 'shipped', courier: 'No update yet (Shiprocket not configured)' }
}
