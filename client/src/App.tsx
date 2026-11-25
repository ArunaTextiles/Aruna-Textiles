import { Routes, Route, useLocation, useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import { CartProvider } from './context/CartContext'
import { AuthProvider } from './context/AuthContext'
import { linkFromUrl } from './lib/auth'
import Nav from './components/Nav'
import AuthToast from './components/AuthToast'
import Footer from './components/Footer'
import CartDrawer from './components/CartDrawer'
import Home from './pages/Home'
import Shop from './pages/Shop'
import Product from './pages/Product'
import Checkout from './pages/Checkout'
import Cart from './pages/Cart'
import OrderSuccess from './pages/OrderSuccess'
import Account from './pages/Account'
import ResetPassword from './pages/ResetPassword'
import OrderDetail from './pages/OrderDetail'
import Contact from './pages/Contact'
import Admin from './pages/Admin'
import NotFound from './pages/NotFound'

export default function App() {
  const { pathname, hash } = useLocation()
  const navigate = useNavigate()

  // Kridhya-style global handler: a recovery (password-reset) email link must reach the
  // reset flow no matter which page its base URL lands on — the SPA serves every path,
  // so redirect anywhere→/account/reset preserving the token_hash in the query.
  useEffect(() => {
    const l = linkFromUrl()
    if (l.tokenHash && l.type === 'recovery' && !pathname.startsWith('/account/reset')) {
      navigate({ pathname: '/account/reset', search: `?type=recovery&token_hash=${encodeURIComponent(l.tokenHash)}` }, { replace: true })
    }
  }, [pathname, navigate])

  useEffect(() => {
    if (hash) {
      const scrollToHash = (smooth: boolean) => {
        const el = document.querySelector(hash)
        if (el) el.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'start' })
      }
      // First attempt once layout settles; re-run after the pinned Journey section
      // finishes measuring (it changes the document height) and after images load.
      const t1 = setTimeout(() => scrollToHash(true), 60)
      const t2 = setTimeout(() => scrollToHash(false), 700)
      const onLoad = () => scrollToHash(false)
      window.addEventListener('load', onLoad)
      return () => {
        clearTimeout(t1)
        clearTimeout(t2)
        window.removeEventListener('load', onLoad)
      }
    }
    window.scrollTo(0, 0)
  }, [pathname, hash])

  const showNav = !['/admin'].includes(pathname)
  const showFooter = !['/admin'].includes(pathname)

  return (
    <AuthProvider>
      <CartProvider>
        {showNav && <Nav />}
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/shop" element={<Shop />} />
          <Route path="/shop/:slug" element={<Product />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/checkout/success" element={<OrderSuccess />} />
          <Route path="/account" element={<Account />} />
          <Route path="/account/reset" element={<ResetPassword />} />
          <Route path="/order/:orderNo" element={<OrderDetail />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
        {showFooter && <Footer />}
        <CartDrawer />
        <AuthToast />
      </CartProvider>
    </AuthProvider>
  )
}
