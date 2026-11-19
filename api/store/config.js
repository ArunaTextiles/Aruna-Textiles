export const runtime = 'nodejs'
import { handle, json } from '../_cors.js'
import { config, mailLive, paymentsLive, serverReady } from '../../server/src/config.js'

// GET /api/store/config — what the checkout can offer (no secrets).
export default handle(async () =>
  json({
    ready: serverReady(),
    onlinePayments: paymentsLive(),
    cod: config.shipping.codEnabled,
    freeShippingAbove: config.shipping.freeAbove,
    flatShipping: config.shipping.flatFee,
    emails: mailLive(),
  }),
)
