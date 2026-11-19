export const runtime = 'nodejs'
import { handle, json, readJson } from '../_cors.js'
import { serverReady } from '../../server/src/config.js'
import { quote } from '../../server/src/checkout.js'

// POST /api/shipping/rates { items, pincode, payment } → shipping quote for the cart
export default handle(async (req) => {
  if (!serverReady()) return json({ error: 'The store server is not configured yet.' }, 503)
  return json(await quote(await readJson(req)))
})
