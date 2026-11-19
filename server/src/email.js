// Customer + admin emails through Brevo's transactional API.
// Emails never block or fail an order: problems are logged and recorded on the order timeline.
import { config, mailLive } from './config.js'
import { addEvent } from './db.js'

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])
const inr = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`

export async function sendEmail({ to, name, subject, html, cc }) {
  if (!mailLive() || !to) return { skipped: true }
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': config.mail.brevoKey, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      sender: { email: config.mail.fromEmail, name: config.mail.fromName },
      to: [{ email: to, ...(name ? { name } : {}) }],
      ...(cc ? { bcc: [{ email: cc }] } : {}),
      subject,
      htmlContent: html,
    }),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(`Brevo ${res.status}: ${body.message || 'send failed'}`)
  }
  return { sent: true }
}

// ── layout (Aruna's white + ivory theme) ──
const shell = (title, inner) => `<!doctype html><html><body style="margin:0;background:#F1EADF;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F1EADF;padding:28px 12px;"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#FBF8F3;border:1px solid #C9A462;">
<tr><td style="background:#1E1812;padding:26px 28px;text-align:center;">
  <div style="font-family:Georgia,serif;font-size:22px;letter-spacing:8px;color:#C9A462;">ARUNA TEXTILE</div>
  <div style="font-family:Georgia,serif;font-size:10px;letter-spacing:4px;color:#A24E2A;margin-top:6px;">WOVEN IN INDIA · SINCE 2016</div>
</td></tr>
<tr><td style="padding:30px 28px 8px;font-family:Georgia,serif;font-size:24px;color:#1E1812;">${esc(title)}</td></tr>
<tr><td style="padding:0 28px 28px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.65;color:#62574B;">${inner}</td></tr>
<tr><td style="border-top:1px solid #E7DCC9;padding:18px 28px;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#8A7A66;text-align:center;">
  Handmade rugs &amp; carpets, finished by hand · <a href="${config.siteUrl}" style="color:#8A7A66;">${esc(config.siteUrl.replace(/^https?:\/\//, ''))}</a>
</td></tr></table></td></tr></table></body></html>`

const button = (href, label) =>
  `<p style="margin:22px 0;"><a href="${href}" style="display:inline-block;background:#1E1812;color:#FBF8F3;text-decoration:none;font-family:Arial,sans-serif;font-size:12px;letter-spacing:2px;text-transform:uppercase;padding:13px 22px;">${esc(label)}</a></p>`

const itemsTable = (o) => `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;border-top:1px solid #E7DCC9;">
${o.items.map((i) => `<tr><td style="padding:10px 0;border-bottom:1px solid #E7DCC9;">${esc(i.name)}<br><span style="color:#8A7A66;font-size:12px;">${i.size ? esc(i.size) + ' · ' : ''}Qty ${i.qty}</span></td><td style="padding:10px 0;border-bottom:1px solid #E7DCC9;text-align:right;">${inr(i.price * i.qty)}</td></tr>`).join('')}
<tr><td style="padding:8px 0;color:#8A7A66;">Shipping</td><td style="padding:8px 0;text-align:right;color:#8A7A66;">${o.shipping ? inr(o.shipping) : 'Free'}</td></tr>
<tr><td style="padding:8px 0;font-weight:bold;">Total</td><td style="padding:8px 0;text-align:right;font-weight:bold;">${inr(o.total)}</td></tr></table>`

const trackLink = (o) => `${config.siteUrl}/track-order?order=${encodeURIComponent(o.order_no)}`
const first = (o) => esc(String(o.customer?.name || '').split(' ')[0] || 'there')

// ── templates ──
export const templates = {
  confirmed: (o) => ({
    subject: `Order confirmed - ${o.order_no}`,
    html: shell('Thank you for your order', `<p>Hello ${first(o)},</p>
<p>We’ve received your order <strong>${esc(o.order_no)}</strong>${o.payment_status === 'cod' ? ' (Cash on Delivery)' : ' and your payment'}. Your rug has entered the workshop queue — we’ll let you know at every stage.</p>
${itemsTable(o)}
<p style="color:#8A7A66;font-size:12px;">Delivering to: ${esc([o.address?.line1, o.address?.line2, o.address?.city, o.address?.state, o.address?.pin].filter(Boolean).join(', '))}</p>
${button(trackLink(o), 'Track your order')}`),
  }),
  shipped: (o) => ({
    subject: `Your order is on its way - ${o.order_no}`,
    html: shell('Your rug has shipped', `<p>Hello ${first(o)},</p>
<p>Order <strong>${esc(o.order_no)}</strong> is on its way${o.courier ? ` with ${esc(o.courier)}` : ''}.${o.awb ? ` Tracking number: <strong>${esc(o.awb)}</strong>.` : ''}</p>
${button(o.tracking_url || trackLink(o), 'Track your parcel')}`),
  }),
  out_for_delivery: (o) => ({
    subject: `Arriving today - ${o.order_no}`,
    html: shell('Out for delivery', `<p>Hello ${first(o)},</p><p>Your order <strong>${esc(o.order_no)}</strong> is out for delivery and should reach you today.${o.payment_status === 'cod' ? ` Please keep <strong>${inr(o.total)}</strong> ready for Cash on Delivery.` : ''}</p>${button(trackLink(o), 'Track your order')}`),
  }),
  delivered: (o) => ({
    subject: `Delivered - ${o.order_no}`,
    html: shell('Delivered — we hope you love it', `<p>Hello ${first(o)},</p><p>Your order <strong>${esc(o.order_no)}</strong> has been delivered. Thank you for choosing Aruna Textile — we’d love to see it in your home.</p>`),
  }),
  cancelled: (o) => ({
    subject: `Order cancelled - ${o.order_no}`,
    html: shell('Your order was cancelled', `<p>Hello ${first(o)},</p><p>Order <strong>${esc(o.order_no)}</strong> has been cancelled.${['paid', 'refunded'].includes(o.payment_status) ? ' Any amount you paid will be refunded to your original payment method.' : ''}</p><p>If this wasn’t expected, just reply to this email.</p>`),
  }),
  payment_failed: (o) => ({
    subject: `Payment not completed - ${o.order_no}`,
    html: shell('Your payment didn’t go through', `<p>Hello ${first(o)},</p><p>The payment for order <strong>${esc(o.order_no)}</strong> wasn’t completed, so we haven’t charged you. Your pieces are held for a short while — you can try again from your account.</p>${button(`${config.siteUrl}/account`, 'Complete payment')}`),
  }),
  custom_order: (c) => ({
    subject: 'Your custom rug request',
    html: shell('We got your custom request', `<p>Hi ${esc(c.name || 'there')},</p>
<p>Your custom rug request (${esc(c.technique || '—')}, ${esc(c.shape || '')} ${esc(String(c.width || ''))}×${esc(String(c.length || ''))} ${esc(c.unit || '')}) reached our workshop. We’ll be in touch on <strong>${esc(c.email || c.phone || 'your contact')}</strong> shortly.</p>`),
  }),
}

const LABEL = { confirmed: 'Order confirmation', shipped: 'Shipped', out_for_delivery: 'Out for delivery', delivered: 'Delivered', cancelled: 'Cancelled', payment_failed: 'Payment not completed' }

// Send a template to the customer (and bcc the shop). Never throws.
export async function notify(kind, order, extra) {
  const label = LABEL[kind] || kind
  const log = (note) => (order?.id ? addEvent(order.id, order.status, note).catch(() => {}) : null)
  try {
    const t = templates[kind]?.(order, extra)
    if (!t) return { skipped: true }
    if (!order?.customer?.email) {
      await log(`Email not sent (${label}): the order has no customer email`)
      return { skipped: true }
    }
    if (!mailLive()) {
      await log(`Email not sent (${label}): customer emails are off — set BREVO_API_KEY and MAIL_FROM_EMAIL in .env`)
      return { skipped: true }
    }
    const ccShop = ['confirmed', 'cancelled'].includes(kind) ? config.mail.adminEmail : undefined
    const r = await sendEmail({ to: order.customer.email, name: order.customer.name, subject: t.subject, html: t.html, cc: ccShop })
    await log(`Email sent: ${label} → ${order.customer.email}`)
    return r
  } catch (e) {
    console.warn(`[email] ${kind} for ${order?.order_no} failed:`, e.message)
    await log(`Email NOT sent (${label}): ${e.message}`)
    return { error: e.message }
  }
}
