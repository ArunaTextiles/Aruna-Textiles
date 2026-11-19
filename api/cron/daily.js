export const runtime = 'nodejs'
import { handle, json } from '../_cors.js'
import { config, serverReady, shiprocketLive } from '../../server/src/config.js'
import { rpc, select } from '../../server/src/db.js'
import { syncTracking } from '../../server/src/orders.js'

// GET /api/cron/daily — Vercel Cron. Vercel sends Authorization: Bearer <CRON_SECRET>.
//  1. cancels online orders left unpaid and releases their stock
//  2. pulls courier status for shipped orders (safety net if a webhook was missed)
export default handle(async (req) => {
  const secret = process.env.CRON_SECRET
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) return json({ error: 'unauthorized' }, 401)
  if (!serverReady()) return json({ error: 'server not configured' }, 503)
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
})
