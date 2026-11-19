export const runtime = 'nodejs'
import { handle, json, query } from '../_cors.js'
import { serverReady } from '../../server/src/config.js'
import { select } from '../../server/src/db.js'

// GET /api/products?technique=&q=
export default handle(async (req) => {
  if (!serverReady()) return json({ error: 'The store server is not configured yet (SUPABASE_URL / SUPABASE_SECRET_KEY).' }, 503)
  try {
    const qs = query(req)
    const f = []
    const technique = qs.get('technique') || ''
    const q = qs.get('q') || ''
    if (technique) f.push(`data->technique=eq.${encodeURIComponent(technique)}`)
    if (q) f.push(`data->>name=ilike.*${encodeURIComponent(q.replace(/%/g, ''))}*`)
    const where = f.length ? `&${f.join('&')}` : ''
    const rows = await select(`products?select=slug,data&status=eq.published${where}&order=created_at.desc`)
    return json({ products: rows.map((r) => ({ ...r.data, slug: r.slug })), ready: true })
  } catch (e) {
    return json({ error: e.message }, 500)
  }
})
