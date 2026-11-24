export type Technique =
  | 'Handtufted'
  | 'Pitloom'
  | 'Braided'
  | 'Broadloom'
  | 'Jacquard'

export type Category = 'Rugs' | 'Carpets' | 'Cushion Covers' | 'Throws' | 'Custom Designs'
export type ProductTag = 'New Arrival' | 'Best Seller'

export interface Product {
  id: string
  slug: string
  name: string
  technique: Technique
  category?: Category
  price: number // INR
  comparePrice?: number
  image: string
  gallery?: string[]
  collection?: string
  sizes?: { label: string; price?: number; stock?: number }[]
  colours?: { name: string; hex: string }[]
  stock: number
  blurb?: string
  description?: string
  published: boolean
  featured?: boolean
  rating?: number
  reviewCount?: number
  tags?: ProductTag[]
  createdAt?: string
  updatedAt?: string
}

export interface CartItem {
  product: Product
  qty: number
  size?: string
}

export interface CustomerInfo {
  name: string
  email: string
  phone: string
}

export interface Address {
  line1: string
  line2?: string
  city: string
  state: string
  pin: string
}

export interface Order {
  id: string
  orderNo: string
  status:
    | 'awaiting_payment'
    | 'placed'
    | 'confirmed'
    | 'packed'
    | 'shipped'
    | 'out_for_delivery'
    | 'delivered'
    | 'cancelled'
    | 'returned'
  paymentStatus: 'pending' | 'paid' | 'refunded' | 'partially_refunded' | 'failed' | 'cod'
  paymentMethod: 'online' | 'cod'
  customer: CustomerInfo
  address: Address
  items: { slug?: string; name: string; qty: number; price: number; technique?: string; size?: string; image?: string }[]
  subtotal: number
  shipping: number
  discount?: number
  total: number
  coupon?: string
  courier?: string
  trackingNo?: string
  trackingUrl?: string
  note?: string
  createdAt: string
}

export interface ApiError {
  error: string
}
