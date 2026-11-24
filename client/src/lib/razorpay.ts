// Loads the Razorpay checkout script and opens the modal once an order is created server-side.
export interface RzpOrder {
  key: string
  orderId: string
  amount: number
  currency: string
  orderNo: string
  customer?: { name?: string; email?: string; phone?: string }
}

declare global {
  interface Window {
    Razorpay?: new (opts: Record<string, unknown>) => { open: () => void }
  }
}

export function loadRazorpay(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true)
    const key = (import.meta.env.VITE_RAZORPAY_KEY_ID as string) || ''
    if (!key) return resolve(false)
    const s = document.createElement('script')
    s.src = 'https://checkout.razorpay.com/v1/checkout.js'
    s.onload = () => resolve(true)
    s.onerror = () => resolve(false)
    document.head.appendChild(s)
  })
}

export interface RzpSuccess {
  razorpay_order_id?: string
  razorpay_payment_id?: string
  razorpay_signature?: string
}

export async function openRazorpay(
  o: RzpOrder,
  onSuccess: (resp: RzpSuccess) => void,
  onFailure?: (e: { error?: { description: string } }) => void,
) {
  const ok = await loadRazorpay()
  if (!ok) throw new Error('Could not load the payment gateway. Please try again.')
  const rzp = new window.Razorpay!({
    key: o.key,
    order_id: o.orderId,
    amount: o.amount,
    currency: o.currency,
    name: 'Aruna Textile',
    description: `Order ${o.orderNo}`,
    prefill: { name: o.customer?.name || '', email: o.customer?.email || '', contact: o.customer?.phone || '' },
    theme: { color: '#A24E2A' },
    handler: onSuccess,
    modal: { ondismiss: () => onFailure?.({ error: { description: 'Payment cancelled' } }) },
  })
  rzp.open()
}
