export const runtime = 'nodejs'
import { handle, json, readJson } from '../_cors.js'
import { mailLive, serverReady } from '../../server/src/config.js'
import { requireAdmin, select } from '../../server/src/db.js'
import { changeStatus, refundOrder, refundable } from '../../server/src/orders.js'

// POST /api/admin/order { orderId, action, ... } — admin JWT
//   action: 'status' { status, note, courier, trackingNo } | 'refund' { amount?, reason } | 'info'
export default handle(async (req) => {
  if (!(await requireAdmin(req))) return json({ error: 'Admins only — sign in with a Supabase account listed in public.admins.' }, 403)
  if (!serverReady()) return json({ error: 'The store server is not configured yet.' }, 503)
  const b = await readJson(req)
  const { action, orderId } = b
  try {
    if (action === 'status') {
      await changeStatus(orderId, b.status, {
        note: b.note,
        courier: b.courier,
        trackingNo: b.trackingNo,
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
  } catch (e) {
    return json({ error: e.message }, e?.status || 400)
  }
})
