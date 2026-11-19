export const runtime = 'nodejs'
import { handle, json, readRaw } from '../_cors.js'
import { config, serverReady } from '../../server/src/config.js'
import { confirmPayment, recordFailure } from '../../server/src/checkout.js'
import { verifyWebhookSignature } from '../../server/src/razorpay.js'

// POST /api/webhooks/razorpay — Razorpay events.
// Razorpay Dashboard > Webhooks: URL https://<site>/api/webhooks/razorpay,
// secret = RAZORPAY_WEBHOOK_SECRET, events: payment.captured, payment.failed, order.paid.
// GET is a reachability check (shows whether the secret is set — never the secret).
function safeParse(s) {
  try {
    return JSON.parse(s)
  } catch {
    return {}
  }
}

export default handle(async (req) => {
  if (req.method === 'GET')
    return json({ ok: true, service: 'aruna-razorpay-webhook', ready: serverReady(), secretSet: !!config.razorpay.webhookSecret })

  const raw = await readRaw(req)
  if (!verifyWebhookSignature(raw, req.headers.get('x-razorpay-signature') || '')) return json({ error: 'invalid signature' }, 401)
  if (!serverReady()) return json({ ok: true, saved: false })

  const event = safeParse(raw)
  const type = event?.event || ''
  const pay = event?.payload?.payment?.entity
  try {
    if ((type === 'payment.captured' || type === 'order.paid') && pay?.order_id && pay?.id) {
      await confirmPayment({ razorpay_order_id: pay.order_id, razorpay_payment_id: pay.id }, { verified: true })
    } else if (type === 'payment.failed' && pay?.order_id) {
      await recordFailure(pay)
    }
  } catch (e) {
    console.error('[razorpay webhook]', type, e.message)
  }
  return json({ ok: true }) // always 200 so Razorpay doesn't keep retrying
})
