// CORS + shared helpers for the Vercel Functions (Web API: Request → Response).
// In production the client and API live on the same Vercel origin (CORS same-origin);
// ALLOW_CORS_ORIGIN (default: SITE_URL, then '*') covers split hosting.
// The shared server modules were written for Web Requests (request.headers.get, etc.),
// so these handlers pass the raw Request through to them.
import { config } from '../server/src/config.js'

const ALLOWED = config.corsOrigin || '*'

export const headers = (extra = {}) => ({
  'Access-Control-Allow-Origin': ALLOWED,
  'Access-Control-Allow-Credentials': ALLOWED === '*' ? 'false' : 'true',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-razorpay-signature, x-razorpay-event-id',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Expose-Headers': 'x-razorpay-signature, x-razorpay-event-id',
  'Cache-Control': 'no-store',
  'Content-Type': 'application/json',
  ...extra,
})

export const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: headers() })

export const readJson = async (req) => {
  try {
    return await req.json()
  } catch {
    return {}
  }
}

// Raw body string — for the Razorpay webhook (signature is over the raw bytes).
export const readRaw = async (req) => {
  try {
    return await req.text()
  } catch {
    return ''
  }
}

export const query = (req) => new URL(req.url, 'http://localhost').searchParams

// Wrap a handler: user-facing errors keep their message, anything else → generic 500.
export const handle = (fn) => async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: headers() })
  try {
    return await fn(req)
  } catch (e) {
    if (e?.status && e.status < 500) return json({ error: e.message }, e.status)
    console.error('[api]', req.url, e)
    return json({ error: e?.status === 502 ? e.message : 'Something went wrong. Please try again.' }, e?.status === 502 ? 502 : 500)
  }
}
