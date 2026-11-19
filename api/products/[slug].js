export const runtime = 'nodejs'
import { handle, json } from '../_cors.js'
import { serverReady } from '../../../server/src/config.js'
import { select } from '../../../server/src/db.js'

// GET /api/products/:slug
export default handle(async (req) => {
  if (!serverReady()) return json({ error: 'The store server is not configured yet.' }, 503)
  try {
    // read the slug from the URL path (/api/products/<slug>) — reliable across runtimes
    const u = new URL(req.url, 'http://localhost')
    const slug = (u.pathname.split('/').filter(Boolean).pop() || '').replace(/[^a-z0-9-]/gi, '').toLowerCase()
    if (!slug) return json({ error: 'Product not found' }, 404)
    const rows = await select(`products?select=slug,data&slug=eq.${encodeURIComponent(slug)}&limit=1`)
    if (!rows.length) return json({ error: 'Product not found' }, 404)
    return json({ product: { ...rows[0].data, slug: rows[0].slug }, ready: true })
  } catch (e) {
    return json({ error: e.message }, 500)
  }
})
