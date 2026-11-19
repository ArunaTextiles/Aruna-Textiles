export const runtime = 'nodejs'
import { handle, json, readJson } from '../_cors.js'
import { serverReady } from '../../server/src/config.js'
import { requireAdmin, insert } from '../../server/src/db.js'

// POST /api/admin/products { slug, name, technique, price, image, gallery, stock, blurb, description, published }
export default handle(async (req) => {
  if (!(await requireAdmin(req))) return json({ error: 'Admins only — sign in with a Supabase account listed in public.admins.' }, 403)
  if (!serverReady()) return json({ error: 'The store server is not configured yet.' }, 503)
  const p = await readJson(req)
  if (!p.slug || !p.name || p.price == null) return json({ error: 'slug, name and price are required' }, 400)
  try {
    const data = {
      name: p.name, technique: p.technique || 'Handtufted', price: Number(p.price),
      image: p.image || '', gallery: p.gallery || [], stock: Number(p.stock ?? 1),
      blurb: p.blurb || '', description: p.description || '', published: p.published !== false,
    }
    await insert('products', { id: p.id || p.slug, slug: p.slug, status: p.published === false ? 'draft' : 'published', data }, { upsert: true })
    return json({ ok: true, slug: p.slug })
  } catch (e) {
    return json({ error: e.message }, 500)
  }
})
