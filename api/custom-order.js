export const runtime = 'nodejs'
import { handle, json, readJson } from './_cors.js'
import { serverReady } from '../server/src/config.js'
import { insert } from '../server/src/db.js'

// POST /api/custom-order — "Design & Customize" request from the drawer
export default handle(async (req) => {
  if (!serverReady()) return json({ error: 'The store server is not configured yet.' }, 503)
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
})
