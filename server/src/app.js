// Aruna Textile — production API (Express).
// Endpoints:
//   GET  /api/products, /api/products/:slug
//   POST /api/checkout, /api/checkout/verify, /api/checkout/retry
//   GET  /api/store/config
//   POST /api/custom-order, /api/webhooks/razorpay
//   GET  /api/admin/orders, POST /api/admin/order, POST /api/admin/products
//   POST /api/auth/send-code, /api/auth/verify-code, GET /api/auth/verify
import express from 'express'
import cors from 'cors'
import { config, mailLive, paymentsLive, serverReady, shiprocketLive } from './config.js'
import { requireAdmin, select, currentUser, update, insert, rpc } from './db.js'
import { confirmPayment, createCheckout, quote, recordFailure, retryPayment } from './checkout.js'
import { verifyCheckoutSignature, verifyWebhookSignature } from './razorpay.js'
import { changeStatus, refundOrder, refundable, syncTracking } from './orders.js'

export function buildApp() {
  const app = express()
  app.use(cors())
  // Raw body for the Razorpay webhook (signature is over the raw bytes)
  app.use((req, res, next) => {
    if (req.path === '/api/webhooks/razorpay') {
      let raw = ''
      req.on('data', (c) => (raw += c))
      req.on('end', () => {
        req.rawBody = raw
        req.body = safeParse(raw)
        next()
      })
      return
    }
    next()
  })
  app.use(express.json({ limit: '1mb' }))

  const notReady = (res) => res.status(503).json({ error: 'The store server is not configured yet (SUPABASE_URL / SUPABASE_SECRET_KEY).' })

  // ── catalog ──
  app.get('/api/products', async (req, res) => {
    if (!serverReady()) return notReady(res)
    try {
      // PostgREST JSONB filters: data->key=eq.value ; text search on data->>name
      const f = []
      if (req.query.technique) f.push(`data->technique=eq.${encodeURIComponent(String(req.query.technique))}`)
      if (req.query.q) f.push(`data->>name=ilike.*${encodeURIComponent(String(req.query.q).replace(/%/g, ''))}*`)
      const where = f.length ? `&${f.join('&')}` : ''
      const rows = await select(`products?select=slug,data&status=eq.published${where}&order=created_at.desc`)
      res.json({ products: rows.map((r) => ({ ...r.data, slug: r.slug })), ready: true })
    } catch (e) {
      res.status(500).json({ error: e.message })
    }
  })

  app.get('/api/products/:slug', async (req, res) => {
    if (!serverReady()) return notReady(res)
    try {
      const rows = await select(`products?select=slug,data&slug=eq.${encodeURIComponent(req.params.slug)}&limit=1`)
      if (!rows.length) return res.status(404).json({ error: 'Product not found' })
      res.json({ product: { ...rows[0].data, slug: rows[0].slug }, ready: true })
    } catch (e) {
      res.status(500).json({ error: e.message })
    }
  })

  // ── checkout ──
  app.post('/api/checkout', async (req, res) => {
    if (!serverReady()) return notReady(res)
    try {
      res.json(await createCheckout(req.body, await currentUser(req)))
    } catch (e) {
      res.status(e?.status || 500).json({ error: e.message || 'Checkout failed.' })
    }
  })

  app.post('/api/checkout/verify', async (req, res) => {
    if (!serverReady()) return notReady(res)
    const b = req.body || {}
    // Signature arrives as razorpay_* from the checkout modal; the webhook is the source of truth.
    try {
      const r = await confirmPayment(b, { verified: b.verified === true })
      res.json({ ok: true, orderNo: r.orderNo })
    } catch (e) {
      res.status(e?.status || 400).json({ error: e.message || 'Could not verify the payment.' })
    }
  })

  app.post('/api/checkout/retry', async (req, res) => {
    if (!serverReady()) return notReady(res)
    try {
      res.json(await retryPayment(String(req.body?.orderNo || ''), await currentUser(req)))
    } catch (e) {
      res.status(e?.status || 500).json({ error: e.message })
    }
  })

  // ── shipping quote ──
  app.post('/api/shipping/rates', async (req, res) => {
    if (!serverReady()) return notReady(res)
    try {
      res.json(await quote(req.body))
    } catch (e) {
      res.status(e?.status || 400).json({ error: e.message })
    }
  })

  // ── store config (public, no secrets) ──
  app.get('/api/store/config', (req, res) => {
    res.json({
      ready: serverReady(),
      onlinePayments: paymentsLive(),
      cod: config.shipping.codEnabled,
      freeShippingAbove: config.shipping.freeAbove,
      flatShipping: config.shipping.flatFee,
      emails: mailLive(),
    })
  })

  // ── custom rug requests ──
  app.post('/api/custom-order', async (req, res) => {
    if (!serverReady()) return notReady(res)
    const c = req.body || {}
    if (!c.name || !c.email) return res.status(400).json({ error: 'Name and email are required.' })
    try {
      await insert('custom_orders', {
        technique: c.technique, shape: c.shape, width: c.width, length: c.length, unit: c.unit,
        quantity: c.quantity, material: c.material, project: c.project, colours: c.colours,
        idea: c.idea, name: c.name, email: c.email, phone: c.phone, country: c.country,
        created_at: new Date().toISOString(),
      })
      res.json({ ok: true })
    } catch (e) {
      res.status(500).json({ error: e.message })
    }
  })

  // ── webhooks ──
  app.get('/api/webhooks/razorpay', (req, res) =>
    res.json({ ok: true, service: 'aruna-razorpay-webhook', ready: serverReady(), secretSet: !!config.razorpay.webhookSecret }),
  )
  app.post('/api/webhooks/razorpay', async (req, res) => {
    if (!verifyWebhookSignature(req.rawBody || '', req.headers['x-razorpay-signature'] || '')) return res.status(401).json({ error: 'invalid signature' })
    if (!serverReady()) return res.json({ ok: true, saved: false })
    const event = req.body || {}
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
    res.json({ ok: true })
  })

  // ── admin ──
  const admin = async (req, res, next) => {
    if (!(await requireAdmin(req))) return res.status(403).json({ error: 'Admins only — sign in with a Supabase account listed in public.admins.' })
    next()
  }

  app.get('/api/admin/orders', admin, async (req, res) => {
    try {
      const rows = await select(`orders?select=*&order=created_at.desc&limit=200`)
      res.json({ orders: rows.map(mapOrder) })
    } catch (e) {
      res.status(500).json({ error: e.message })
    }
  })

  app.get('/api/admin/custom-orders', admin, async (req, res) => {
    try {
      const rows = await select(`custom_orders?select=*&order=created_at.desc&limit=200`)
      res.json({ orders: rows })
    } catch (e) {
      res.status(500).json({ error: e.message })
    }
  })

  app.post('/api/admin/order', admin, async (req, res) => {
    const { action, orderId } = req.body || {}
    if (action === 'status') return changeStatus(orderId, req.body.status, { note: req.body.note, courier: req.body.courier, trackingNo: req.body.trackingNo, actor: req.headers['x-admin-email'] || 'admin' }).then(() => res.json({ ok: true }), (e) => res.status(400).json({ error: e.message }))
    if (action === 'refund') return refundOrder(orderId, { amount: req.body.amount, reason: req.body.reason }).then((r) => res.json({ ok: true, ...r }), (e) => res.status(400).json({ error: e.message }))
    if (action === 'info') {
      const o = (await select(`orders?id=eq.${encodeURIComponent(orderId)}&select=*&limit=1`))[0]
      return res.json({ ok: true, refunds: [], refundable: o ? await refundable(o) : 0, emails: mailLive() })
    }
    res.status(400).json({ error: 'Unknown action' })
  })

  app.post('/api/admin/products', admin, async (req, res) => {
    const p = req.body || {}
    if (!p.slug || !p.name || p.price == null) return res.status(400).json({ error: 'slug, name and price are required' })
    try {
      const data = {
        name: p.name, technique: p.technique || 'Handtufted', price: Number(p.price),
        image: p.image || '', gallery: p.gallery || [], stock: Number(p.stock ?? 1),
        blurb: p.blurb || '', description: p.description || '', published: p.published !== false,
      }
      await insert('products', { id: p.id || p.slug, slug: p.slug, status: p.published === false ? 'draft' : 'published', data }, { upsert: true })
      res.json({ ok: true, slug: p.slug })
    } catch (e) {
      res.status(500).json({ error: e.message })
    }
  })

  // ── customer auth helpers (email OTP via Supabase) ──
  app.get('/api/auth/verify', async (req, res) => {
    const user = await currentUser(req)
    res.json({ valid: !!user, user })
  })

  // Daily maintenance: cancel unpaid online orders + safety-net courier status sync.
  // Vercel Cron calls this with Authorization: Bearer <CRON_SECRET> (see vercel.json).
  app.get('/api/cron/daily', async (req, res) => {
    const secret = process.env.CRON_SECRET
    if (!secret || req.headers.authorization !== `Bearer ${secret}`) return res.status(401).json({ error: 'unauthorized' })
    if (!serverReady()) return res.status(503).json({ error: 'server not configured' })
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
      res.json({ ok: true, expired, synced })
    } catch (e) {
      res.status(500).json({ error: e.message })
    }
  })

  app.get('/health', (req, res) => res.json({ ok: true, ready: serverReady(), payments: paymentsLive(), emails: mailLive() }))

  const mapOrder = (o) => ({
    ...o,
    orderNo: o.order_no,
    paymentStatus: o.payment_status,
    paymentMethod: o.payment_method,
    trackingNo: o.tracking_no,
    createdAt: o.created_at,
  })

  return app
}

function safeParse(s) {
  try {
    return JSON.parse(s)
  } catch {
    return {}
  }
}
