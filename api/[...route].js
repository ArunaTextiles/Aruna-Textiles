// Single catch-all Vercel Function — Hobby plan allows max 12 functions/deployment,
// so every /api/* route is dispatched here. Same shared modules, same behavior
// as the standalone function files (which were removed to fit the limit).
export const runtime = 'nodejs'
import { handle, json, readJson, readRaw, query } from './_cors.js'
import { config, mailLive, paymentsLive, serverReady, shiprocketLive } from '../server/src/config.js'
import { currentUser, insert, requireAdmin, rpc, select } from '../server/src/db.js'
import { confirmPayment, createCheckout, quote, recordFailure, retryPayment } from '../server/src/checkout.js'
import { verifyWebhookSignature } from '../server/src/razorpay.js'
import { changeStatus, refundOrder, refundable, syncTracking } from '../server/src/orders.js'

const notReady = () => json({ error: 'The store server is not configured yet (SUPABASE_URL / SUPABASE_SECRET_KEY).' }, 503)

// segments after /api — e.g. "checkout/verify", "admin/orders"
const path = (req) => {
  const u = new URL(req.url, 'http://localhost')
  return u.pathname.split('/').filter(Boolean).slice(1).join('/')
}

const mapOrder = (o) => ({
  ...o,
  orderNo: o.order_no,
  paymentStatus: o.payment_status,
  paymentMethod: o.payment_method,
  trackingNo: o.tracking_no,
  createdAt: o.created_at,
})

function safeParse(s) {
  try { return JSON.parse(s) } catch { return {} }
}

export default handle(async (req) => {
  const p = path(req)
  const m = req.method

  // ── health ──
  if (p === 'health')
    return json({ ok: true, ready: serverReady(), payments: paymentsLive(), emails: mailLive(), site: config.siteUrl })

  // ── catalog ──
  if (m === 'GET' && p === 'products') {
    if (!serverReady()) return notReady()
    const qs = query(req)
    const f = []
    const technique = qs.get('technique') || ''
    const q = qs.get('q') || ''
    if (technique) f.push(`data->technique=eq.${encodeURIComponent(technique)}`)
    if (q) f.push(`data->>name=ilike.*${encodeURIComponent(q.replace(/%/g, ''))}*`)
    const where = f.length ? `&${f.join('&')}` : ''
    try {
      const rows = await select(`products?select=slug,data&status=eq.published${where}&order=created_at.desc`)
      return json({ products: rows.map((r) => ({ ...r.data, slug: r.slug })), ready: true })
    } catch (e) {
      return json({ error: e.message }, 500)
    }
  }
  if (m === 'GET' && p.startsWith('products/')) {
    if (!serverReady()) return notReady()
    const slug = p.slice('products/'.length).replace(/[^a-z0-9-]/gi, '').toLowerCase()
    if (!slug) return json({ error: 'Product not found' }, 404)
    try {
      const rows = await select(`products?select=slug,data&slug=eq.${encodeURIComponent(slug)}&limit=1`)
      if (!rows.length) return json({ error: 'Product not found' }, 404)
      return json({ product: { ...rows[0].data, slug: rows[0].slug }, ready: true })
    } catch (e) {
      return json({ error: e.message }, 500)
    }
  }

  // ── checkout ──
  if (m === 'POST' && p === 'checkout') {
    if (!serverReady()) return notReady()
    try {
      const out = await createCheckout(await readJson(req), await currentUser(req))
      return json(out)
    } catch (e) {
      return json({ error: e.message || 'Checkout failed.' }, e?.status || 500)
    }
  }
  if (m === 'POST' && p === 'checkout/verify') {
    if (!serverReady()) return notReady()
    try {
      const b = await readJson(req)
      const r = await confirmPayment(b, { verified: b.verified === true })
      return json({ ok: true, orderNo: r.orderNo, late: r.late })
    } catch (e) {
      return json({ error: e.message || 'Could not verify the payment.' }, e?.status || 400)
    }
  }
  if (m === 'POST' && p === 'checkout/retry') {
    if (!serverReady()) return notReady()
    try {
      const { orderNo } = await readJson(req)
      return json(await retryPayment(String(orderNo || ''), await currentUser(req)))
    } catch (e) {
      return json({ error: e.message }, e?.status || 500)
    }
  }

  // ── shipping quote ──
  if (m === 'POST' && p === 'shipping/rates') {
    if (!serverReady()) return notReady()
    try {
      return json(await quote(await readJson(req)))
    } catch (e) {
      return json({ error: e.message }, e?.status || 400)
    }
  }

  // ── store config (public, no secrets) ──
  if (m === 'GET' && p === 'store/config')
    return json({
      ready: serverReady(),
      onlinePayments: paymentsLive(),
      cod: config.shipping.codEnabled,
      freeShippingAbove: config.shipping.freeAbove,
      flatShipping: config.shipping.flatFee,
      emails: mailLive(),
    })

  // ── custom rug requests ──
  if (m === 'POST' && p === 'custom-order') {
    if (!serverReady()) return notReady()
    const c = await readJson(req)
    if (!c.name || !c.email) return json({ error: 'Name and email are required.' }, 400)
    try {
      await insert('custom_orders', {
        technique: c.technique, shape: c.shape, width: c.width, length: c.length, unit: c.unit,
        quantity: c.quantity, material: c.material, project: c.project, colours: c.colours,
        idea: c.idea, name: c.name, email: c.email, phone: c.phone, country: c.country,
        created_at: new Date().toISOString(),
      })
      return json({ ok: true })
    } catch (e) {
      return json({ error: e.message }, 500)
    }
  }

  // ── Razorpay webhook ──
  if (p === 'webhooks/razorpay') {
    if (m === 'GET')
      return json({ ok: true, service: 'aruna-razorpay-webhook', ready: serverReady(), secretSet: !!config.razorpay.webhookSecret })
    const raw = await readRaw(req)
    if (!verifyWebhookSignature(raw, req.headers.get('x-razorpay-signature') || ''))
      return json({ error: 'invalid signature' }, 401)
    if (!serverReady()) return json({ ok: true, saved: false })
    const event = safeParse(raw)
    const type = event?.event || ''
    const pay = event?.payload?.payment?.entity
    try {
      if ((type === 'payment.captured' || type === 'order.paid') && pay?.order_id && pay?.id)
        await confirmPayment({ razorpay_order_id: pay.order_id, razorpay_payment_id: pay.id }, { verified: true })
      else if (type === 'payment.failed' && pay?.order_id)
        await recordFailure(pay)
    } catch (e) {
      console.error('[razorpay webhook]', type, e.message)
    }
    return json({ ok: true }) // always 200 so Razorpay doesn't keep retrying
  }

  // ── daily maintenance (Vercel Cron → /api/cron/daily) ──
  if (m === 'GET' && p === 'cron/daily') {
    const secret = process.env.CRON_SECRET
    if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) return json({ error: 'unauthorized' }, 401)
    if (!serverReady()) return json({ error: 'server not configured' }, 503)
    try {
      const expired = await rpc('expire_unpaid_orders', { p_minutes: config.unpaidHoldMinutes }).catch((e) => `error: ${e.message}`)
      const synced = []
      if (shiprocketLive()) {
        const open = await select("orders?select=id,order_no&awb=not.is.null&status=in.(packed,shipped,out_for_delivery)&order=updated_at.asc&limit=25")
        for (const o of open) {
          try {
            synced.push({ order: o.order_no, ...(await syncTracking(o.id)) })
          } catch (e) {
            synced.push({ order: o.order_no, error: e.message })
          }
        }
      }
      return json({ ok: true, expired, synced })
    } catch (e) {
      return json({ error: e.message }, 500)
    }
  }

  // ── admin (requires admin JWT) ──
  if (p.startsWith('admin/')) {
    if (!(await requireAdmin(req)))
      return json({ error: 'Admins only — sign in with a Supabase account listed in public.admins.' }, 403)
    if (!serverReady()) return notReady()
    try {
      if (m === 'GET' && p === 'admin/orders') {
        const rows = await select(`orders?select=*&order=created_at.desc&limit=200`)
        return json({ orders: rows.map(mapOrder) })
      }
      if (m === 'GET' && p === 'admin/custom-orders') {
        const rows = await select(`custom_orders?select=*&order=created_at.desc&limit=200`)
        return json({ orders: rows })
      }
      if (m === 'POST' && p === 'admin/order') {
        const b = await readJson(req)
        const { action, orderId } = b
        if (action === 'status') {
          await changeStatus(orderId, b.status, {
            note: b.note, courier: b.courier, trackingNo: b.trackingNo,
            actor: req.headers.get('x-admin-email') || 'admin',
          })
          return json({ ok: true })
        }
        if (action === 'refund') return json({ ok: true, ...(await refundOrder(orderId, { amount: b.amount, reason: b.reason || '' })) })
        if (action === 'info') {
          const o = (await select(`orders?id=eq.${encodeURIComponent(orderId)}&select=*&limit=1`))[0]
          return json({ ok: true, refunds: [], refundable: o ? await refundable(o) : 0, emails: mailLive() })
        }
        return json({ error: 'Unknown action' }, 400)
      }
      if (m === 'POST' && p === 'admin/products') {
        const prod = await readJson(req)
        if (!prod.slug || !prod.name || prod.price == null) return json({ error: 'slug, name and price are required' }, 400)
        const data = {
          name: prod.name, technique: prod.technique || 'Handtufted', price: Number(prod.price),
          image: prod.image || '', gallery: prod.gallery || [], stock: Number(prod.stock ?? 1),
          blurb: prod.blurb || '', description: prod.description || '', published: prod.published !== false,
        }
        await insert('products', { id: prod.id || prod.slug, slug: prod.slug, status: prod.published === false ? 'draft' : 'published', data }, { upsert: true })
        return json({ ok: true, slug: prod.slug })
      }
    } catch (e) {
      return json({ error: e.message }, e?.status || 400)
    }
    return json({ error: 'Unknown admin route' }, 404)
  }

  // ── customer auth ──
  if (m === 'GET' && p === 'auth/verify') {
    const user = await currentUser(req)
    return json({ valid: !!user, user })
  }

  return json({ error: 'Not found' }, 404)
})
