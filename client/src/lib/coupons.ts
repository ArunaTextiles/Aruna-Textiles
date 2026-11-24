// Coupon codes for the storefront. In a full build these live in the database (or a
// Supabase `coupons` table read via the API); until then this is the single source of
// truth the checkout uses. ARUNA500 = ₹500 off. Extend freely.

export interface Coupon {
  code: string
  kind: 'fixed' | 'percent'
  value: number // ₹ for fixed, % for percent
  minOrder?: number // subtotal threshold, if any
  label: string
}

const COUPONS: Coupon[] = [
  { code: 'ARUNA500', kind: 'fixed', value: 500, label: '₹500 off your order' },
]

export function findCoupon(code: string) {
  return COUPONS.find((c) => c.code === code.toUpperCase().trim())
}

export function couponDiscount(c: Coupon | undefined, subtotal: number) {
  if (!c || (c.minOrder && subtotal < c.minOrder)) return 0
  return c.kind === 'percent' ? Math.round((subtotal * c.value) / 100) : c.value
}
