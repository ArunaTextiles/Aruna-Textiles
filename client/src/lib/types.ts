export type Technique =
  | 'Handtufted'
  | 'Pitloom'
  | 'Braided'
  | 'Broadloom'
  | 'Jacquard'

export interface Product {
  id: string
  slug: string
  name: string
  technique: Technique
  price: number // INR
  comparePrice?: number
  image: string
  gallery?: string[]
  sizes?: { label: string; price: number; stock: number }[]
  stock: number
  blurb?: string
  description?: string
  published: boolean
  featured?: boolean
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
    | 'placed'
    | 'confirmed'
    | 'packed'
    | 'shipped'
    | 'out_for_delivery'
    | 'delivered'
    | 'cancelled'
  paymentStatus: 'pending' | 'paid' | 'refunded' | 'failed' | 'cod'
  paymentMethod: 'online' | 'cod'
  customer: CustomerInfo
  address: Address
  items: { name: string; qty: number; price: number; size?: string; image?: string }[]
  subtotal: number
  shipping: number
  total: number
  razorpayOrderId?: string
  trackingNo?: string
  courier?: string
  createdAt: string
}

export interface ApiError {
  error: string
}
