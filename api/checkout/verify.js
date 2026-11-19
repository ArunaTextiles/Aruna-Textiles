export const runtime = 'nodejs'
import { handle, json, readJson } from '../_cors.js'
import { serverReady } from '../../server/src/config.js'
import { confirmPayment } from '../../server/src/checkout.js'

// POST /api/checkout/verify { razorpay_order_id, razorpay_payment_id, razorpay_signature }
// The browser checkout callback; the webhook is the source of truth.
export default handle(async (req) => {
  if (!serverReady()) return json({ error: 'The store server is not configured yet.' }, 503)
  const b = await readJson(req)
  const r = await confirmPayment(b, { verified: b.verified === true })
  return json({ ok: true, orderNo: r.orderNo, late: r.late })
})
