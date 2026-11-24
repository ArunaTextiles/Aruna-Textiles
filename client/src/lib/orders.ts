// Order stages — one list shared by the customer tracking page and Admin > Orders.
// Keep in sync with the status check in db/schema.sql.

export const ORDER_STAGES = [
  { id: 'placed', label: 'Order Placed', customer: 'We have received your order.' },
  { id: 'confirmed', label: 'Order Confirmed', customer: 'Your order is confirmed and being prepared.' },
  { id: 'packed', label: 'Packed', customer: 'Your rug is packed and ready to ship.' },
  { id: 'shipped', label: 'Shipped', customer: 'Your order is on its way with our delivery partner.' },
  { id: 'out_for_delivery', label: 'Out for delivery', customer: 'Arriving today.' },
  { id: 'delivered', label: 'Delivered', customer: 'Delivered — we hope you love it.' },
] as const

export type OrderStatus = (typeof ORDER_STAGES)[number]['id'] | 'cancelled' | 'returned' | 'awaiting_payment'

const EXTRA: Record<string, { id: string; label: string; customer?: string }> = {
  cancelled: { id: 'cancelled', label: 'Cancelled', customer: 'This order was cancelled.' },
  awaiting_payment: { id: 'awaiting_payment', label: 'Awaiting payment', customer: 'Waiting for your online payment to complete.' },
  returned: { id: 'returned', label: 'Returned', customer: 'This parcel was returned to us. We will be in touch.' },
}

export const DONE: OrderStatus[] = ['delivered', 'cancelled', 'returned']
export const OPEN: OrderStatus[] = ['awaiting_payment', 'placed', 'confirmed', 'packed', 'shipped', 'out_for_delivery']

export const stageIndex = (status: string) => ORDER_STAGES.findIndex((s) => s.id === status)
export const stageOf = (status: string) =>
  ORDER_STAGES.find((s) => s.id === status) || EXTRA[status] || { id: status, label: status }

export const fmtDateTime = (d: string | number) =>
  new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' })
