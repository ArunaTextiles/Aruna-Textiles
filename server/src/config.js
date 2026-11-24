// Server config — read from environment only, never reaches the browser.
import 'dotenv/config'

const env = (k, d = '') => (process.env[k] ?? d).trim()
const num = (k, d) => (process.env[k] ? Number(process.env[k]) : d)

export const config = {
  port: num('PORT', 4000),
  siteUrl: env('SITE_URL', 'http://localhost:5173'),
  // CORS origin for the API (the storefront). Same origin when client + API are
  // deployed together on Vercel; set this when they're split. '*' = any origin.
  corsOrigin: env('ALLOW_CORS_ORIGIN', env('SITE_URL') || '*'),

  // Supabase (server-only secret key / service role — bypasses RLS)
  supabaseUrl: env('SUPABASE_URL').replace(/\/+$/, ''),
  supabaseSecret: env('SUPABASE_SECRET_KEY') || env('SUPABASE_SERVICE_ROLE_KEY'),

  // Razorpay
  razorpay: {
    keyId: env('RAZORPAY_KEY_ID'),
    keySecret: env('RAZORPAY_KEY_SECRET'),
    webhookSecret: env('RAZORPAY_WEBHOOK_SECRET'),
  },

  // Shipping — flat fee until Shiprocket is confirmed (client said "shiprocket for now, consider later")
  shipping: {
    flatFee: num('SHIPPING_FLAT_FEE', 499),
    freeAbove: num('FREE_SHIPPING_ABOVE', 25000),
    codEnabled: env('COD_ENABLED', 'true') !== 'false',
    codFee: num('COD_FEE', 0),
  },

  // Unpaid online orders are held (stock reserved) for this long before the cron expires them
  unpaidHoldMinutes: num('UNPAID_ORDER_MINUTES', 30),

  // Brevo transactional email
  mail: {
    brevoKey: env('BREVO_API_KEY'),
    fromEmail: env('MAIL_FROM_EMAIL'),
    fromName: env('MAIL_FROM_NAME', 'Aruna Textile'),
    adminEmail: env('ADMIN_NOTIFY_EMAIL'), // cc on new orders
  },

  // Supabase storage bucket for product / editorial images
  storage: {
    bucket: env('SUPABASE_IMAGE_BUCKET', 'aruna-images'),
  },

  // Storefront coupon codes — single source of truth, kept in sync with
  // client/src/lib/coupons.ts (which only mirrors the *validity* for UI).
  // kind: 'fixed' (₹ value) or 'percent' (value out of 100).
  coupons: [
    { code: 'ARUNA500', kind: 'fixed', value: 500, minOrder: 0 },
  ],
}

export const serverReady = () => !!(config.supabaseUrl && config.supabaseSecret)
export const paymentsLive = () => !!(config.razorpay.keyId && config.razorpay.keySecret)
export const mailLive = () => !!(config.mail.brevoKey && config.mail.fromEmail)

// Shiprocket is not wired up yet (flat-fee shipping for now). When you confirm it,
// add SHIPROCKET_EMAIL/PASSWORD/PICKUP_PINCODE env vars and make this return true.
export const shiprocketLive = () => false
