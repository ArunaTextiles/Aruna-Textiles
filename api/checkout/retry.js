export const runtime = 'nodejs'
import { handle, json, readJson } from '../_cors.js'
import { serverReady } from '../../server/src/config.js'
import { retryPayment } from '../../server/src/checkout.js'
import { currentUser } from '../../server/src/db.js'

// POST /api/checkout/retry { orderNo } — signed-in customer reopens payment for their unpaid order
export default handle(async (req) => {
  if (!serverReady()) return json({ error: 'The store server is not configured yet.' }, 503)
  const { orderNo } = await readJson(req)
  return json(await retryPayment(String(orderNo || ''), await currentUser(req)))
})
