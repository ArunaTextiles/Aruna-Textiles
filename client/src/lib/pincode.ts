// PIN code -> city + state via India Post's public lookup. Cached; failures are silent
// (the shopper can type the city/state in manually).

const pinCache: Record<string, { found: boolean; city?: string; state?: string } | null> = {}

export async function lookupPin(pin: string): Promise<{ found: boolean; city?: string; state?: string } | null> {
  if (pin in pinCache) return pinCache[pin]
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), 6000)
  try {
    const res = await fetch(`https://api.postalpincode.in/pincode/${pin}`, { signal: ctrl.signal })
    const [r] = await res.json()
    const offices = r?.Status === 'Success' ? r.PostOffice || [] : []
    if (!offices.length) return (pinCache[pin] = { found: false })
    // most common district among the post offices for this PIN
    const count: Record<string, number> = {}
    offices.forEach((o: { District: string }) => { count[o.District] = (count[o.District] || 0) + 1 })
    const city = Object.entries(count).sort((a, b) => b[1] - a[1])[0][0]
    return (pinCache[pin] = { found: true, city, state: offices[0].State })
  } catch {
    return null // offline / service down: don't cache, don't block checkout
  } finally {
    clearTimeout(t)
  }
}

export const fmtEtd = (q: { etd?: string; days?: number }) => {
  if (!q?.etd) return q?.days ? `${q.days} days` : ''
  const d = new Date(q.etd)
  return Number.isNaN(d.getTime()) ? q.etd : d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })
}
