export const runtime = 'nodejs'
import { handle, json, readJson } from '../_cors.js'
import { serverReady } from '../../server/src/config.js'
import { createCheckout } from '../../server/src/checkout.js'
import { currentUser } from '../../server/src/db.js'

// POST /api/checkout  { customer, address, items, note, payment:'online'|'cod' }
// Creates the order (server-priced + stock-checked) and, for online payment, the Razorpay order.
export default handle(async (req) => {
  if (!serverReady()) return json({ error: 'The store server is not configured yet (SUPABASE_URL / SUPABASE_SECRET_KEY).' }, 503)
  const body = await readJson(req)
  const out = await createCheckout(body, await currentUser(req))
  return json(out)
})
