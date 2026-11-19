export const runtime = 'nodejs'
import { handle, json } from '../_cors.js'
import { serverReady } from '../../server/src/config.js'
import { requireAdmin, select } from '../../server/src/db.js'

const mapOrder = (o) => ({
  ...o,
  orderNo: o.order_no,
  paymentStatus: o.payment_status,
  paymentMethod: o.payment_method,
  trackingNo: o.tracking_no,
  createdAt: o.created_at,
})

// GET /api/admin/orders — admin JWT (Authorization: Bearer <access token>)
export default handle(async (req) => {
  if (!(await requireAdmin(req))) return json({ error: 'Admins only — sign in with a Supabase account listed in public.admins.' }, 403)
  if (!serverReady()) return json({ error: 'The store server is not configured yet.' }, 503)
  try {
    const rows = await select(`orders?select=*&order=created_at.desc&limit=200`)
    return json({ orders: rows.map(mapOrder) })
  } catch (e) {
    return json({ error: e.message }, 500)
  }
})
