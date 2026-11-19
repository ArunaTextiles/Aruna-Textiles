import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { CartItem, Product } from '../lib/types'

interface CartCtx {
  items: CartItem[]
  count: number
  subtotal: number
  open: boolean
  setOpen: (v: boolean) => void
  add: (product: Product, qty?: number, size?: string) => void
  remove: (id: string, size?: string) => void
  setQty: (id: string, qty: number, size?: string) => void
  clear: () => void
}

const Ctx = createContext<CartCtx | null>(null)
const KEY = 'aruna-cart'

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(KEY) || '[]')
    } catch {
      return []
    }
  })
  const [open, setOpen] = useState(false)

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(items))
  }, [items])

  const value = useMemo<CartCtx>(() => {
    const key = (id: string, size?: string) => `${id}__${size || ''}`
    const add = (product: Product, qty = 1, size?: string) =>
      setItems((prev) => {
        const k = key(product.id, size)
        const found = prev.find((i) => key(i.product.id, i.size) === k)
        if (found) return prev.map((i) => (key(i.product.id, i.size) === k ? { ...i, qty: i.qty + qty } : i))
        return [...prev, { product, qty, size }]
      })
    const remove = (id: string, size?: string) =>
      setItems((prev) => prev.filter((i) => key(i.product.id, i.size) !== key(id, size)))
    const setQty = (id: string, qty: number, size?: string) =>
      setItems((prev) =>
        qty <= 0
          ? prev.filter((i) => key(i.product.id, i.size) !== key(id, size))
          : prev.map((i) => (key(i.product.id, i.size) === key(id, size) ? { ...i, qty } : i)),
      )
    return {
      items,
      count: items.reduce((n, i) => n + i.qty, 0),
      subtotal: items.reduce((n, i) => n + i.product.price * i.qty, 0),
      open,
      setOpen,
      add,
      remove,
      setQty,
      clear: () => setItems([]),
    }
  }, [items, open])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export const useCart = () => {
  const c = useContext(Ctx)
  if (!c) throw new Error('useCart outside provider')
  return c
}
