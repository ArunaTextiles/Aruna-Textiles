import { useEffect, useState } from 'react'
import { api, fmtINR } from '../lib/api'
import type { Order, Product } from '../lib/types'
import { useAuth } from '../context/AuthContext'
import { hasSupabase, supabase } from '../lib/supabase'

type Tab = 'orders' | 'products' | 'customize'

async function authToken(): Promise<string> {
  if (!hasSupabase) return ''
  const { data } = await supabase().auth.getSession()
  return data.session?.access_token || ''
}

export default function Admin() {
  const { user } = useAuth()
  const [tab, setTab] = useState<Tab>('orders')
  const [orders, setOrders] = useState<Order[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [cust, setCust] = useState<Record<string, unknown>[]>([])

  const load = async () => {
    const base = import.meta.env.VITE_API_URL || ''
    const token = await authToken()
    const auth = token ? { Authorization: `Bearer ${token}` } : {}
    const get = async (p: string) => (await fetch(`${base}/api${p}`, { headers: auth })).json()
    const [o, pr, c] = await Promise.all([get('/admin/orders'), get('/products'), get('/admin/custom-orders')])
    setOrders(o.orders || [])
    setProducts(pr.products || [])
    setCust(c.orders || [])
  }

  useEffect(() => { load() }, [user])

  const addProduct = async () => {
    const name = prompt('Product name')
    if (!name) return
    const p: Product = {
      id: crypto.randomUUID(),
      slug: prompt('Slug (e.g. coral-tufted)', name.toLowerCase().replace(/\s+/g, '-'))!,
      name,
      technique: ((prompt('Technique (Handtufted/Pitloom/Braided/Broadloom/Jacquard)') || 'Handtufted') as Product['technique']),
      price: Number(prompt('Price (INR)') || 0),
      image: prompt('Image path (e.g. /images/hq/coral-1000.webp)') || '',
      stock: Number(prompt('Stock') || 1),
      blurb: prompt('Short blurb') || undefined,
      published: true,
    }
    if (!p.slug || !p.name || !p.price) return
    const base = import.meta.env.VITE_API_URL || ''
    const token = await authToken()
    await fetch(`${base}/api/admin/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify(p),
    })
    load()
  }

  return (
    <div className="admin">
      <div className="wrap">
        <span className="kicker">ADMIN</span>
        <h1>Aruna Textile Dashboard</h1>
        <p style={{ color: 'var(--ink-soft)', fontSize: 13, marginTop: 8 }}>
          {user ? `Signed in as ${user.email}` : 'Development mode — admin endpoints are open locally. In production, protect this dashboard with a Supabase admin role.'}
        </p>

        <div className="admin-tabs">
          {(['orders', 'products', 'customize'] as Tab[]).map((t) => (
            <button key={t} className={tab === t ? 'on' : ''} onClick={() => setTab(t)}>{t}</button>
          ))}
        </div>

        {tab === 'orders' && (
          <table className="admin-table">
            <thead><tr><th>Order</th><th>Customer</th><th>Items</th><th>Total</th><th>Payment</th><th>Status</th></tr></thead>
            <tbody>
              {orders.length === 0 && <tr><td colSpan={6} className="muted">No orders yet.</td></tr>}
              {orders.map((o) => (
                <tr key={o.id}>
                  <td>{o.orderNo}<br /><small>{new Date(o.createdAt).toLocaleDateString('en-IN')}</small></td>
                  <td>{o.customer.name}<br /><small>{o.customer.email}</small></td>
                  <td>{o.items.map((i) => `${i.name} ×${i.qty}`).join(', ')}</td>
                  <td>{fmtINR(o.total)}</td>
                  <td>{o.paymentMethod} · {o.paymentStatus}</td>
                  <td>{o.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {tab === 'products' && (
          <>
            <button className="btn" style={{ marginBottom: 20 }} onClick={addProduct}>+ Add product</button>
            <table className="admin-table">
              <thead><tr><th>Name</th><th>Technique</th><th>Price</th><th>Stock</th><th>Published</th></tr></thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id}>
                    <td>{p.name}<br /><small>{p.slug}</small></td>
                    <td>{p.technique}</td>
                    <td>{fmtINR(p.price)}</td>
                    <td>{p.stock}</td>
                    <td>{p.published ? 'yes' : 'no'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        {tab === 'customize' && (
          <table className="admin-table">
            <thead><tr><th>Name</th><th>Technique</th><th>Shape</th><th>Size</th><th>Material</th><th>Email</th></tr></thead>
            <tbody>
              {cust.length === 0 && <tr><td colSpan={6} className="muted">No custom requests yet.</td></tr>}
              {cust.map((c, i) => (
                <tr key={i}>
                  <td>{String(c.name || '')}</td>
                  <td>{String(c.technique || '')}</td>
                  <td>{String(c.shape || '')}</td>
                  <td>{`${c.width || ''} × ${c.length || ''} ${c.unit || ''}`}</td>
                  <td>{String(c.material || '')}</td>
                  <td>{String(c.email || '')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
