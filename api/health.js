export const runtime = 'nodejs'
import { handle, json } from './_cors.js'
import { config, mailLive, paymentsLive, serverReady } from '../server/src/config.js'

// GET /api/health
export default handle(async () =>
  json({ ok: true, ready: serverReady(), payments: paymentsLive(), emails: mailLive(), site: config.siteUrl }),
)
