export const runtime = 'nodejs'
import { handle, json } from '../_cors.js'
import { serverReady } from '../../server/src/config.js'
import { requireAdmin, select } from '../../server/src/db.js'

// GET /api/admin/custom-orders — admin JWT
export default handle(async (req) => {
  if (!(await requireAdmin(req))) return json({ error: 'Admins only.' }, 403)
  if (!serverReady()) return json({ error: 'The store server is not configured yet.' }, 503)
  try {
    const rows = await select(`custom_orders?select=*&order=created_at.desc&limit=200`)
    return json({ orders: rows })
  } catch (e) {
    return json({ error: e.message }, 500)
  }
})
