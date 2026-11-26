import { Routes, Route, useLocation, useNavigate } from 'react-router-dom'
import { useEffect, lazy, Suspense } from 'react'
import { CartProvider } from './context/CartContext'
import { AuthProvider } from './context/AuthContext'
import { linkFromUrl } from './lib/auth'
import Nav from './components/Nav'
import AuthToast from './components/AuthToast'
import Footer from './components/Footer'
import CartDrawer from './components/CartDrawer'

// Route-level code splitting: the initial page only pays for its own route.
// Vercel serves every SPA path from the same build, so a missing chunk
// (first visit to a route on a long-deployed CDN edge) fails gracefully
// into the spinner below — and the spinner's chunk is the very first
// one the browser fetches, so it can always load.
const Home = lazy(() => import('./pages/Home'))
const Shop = lazy(() => import('./pages/Shop'))
const Product = lazy(() => import('./pages/Product'))
const Checkout = lazy(() => import('./pages/Checkout'))
const Cart = lazy(() => import('./pages/Cart'))
const OrderSuccess = lazy(() => import('./pages/OrderSuccess'))
const Account = lazy(() => import('./pages/Account'))
const ResetPassword = lazy(() => import('./pages/ResetPassword'))
const OrderDetail = lazy(() => import('./pages/OrderDetail'))
const Contact = lazy(() => import('./pages/Contact'))
const Admin = lazy(() => import('./pages/Admin'))
const NotFound = lazy(() => import('./pages/NotFound'))

function RouteFallback() {
  return (
    <div className="page store" style={{ minHeight: '50vh' }}>
      <div className="wrap" style={{ display: 'grid', placeItems: 'center', padding: '96px 0 140px' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 30, height: 30, margin: '0 auto', border: '2px solid var(--rust)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin .8s linear infinite' }} />
          <p style={{ marginTop: 14, fontSize: 13, color: 'var(--muted, #8a8578)' }}>Loading…</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    </div>
  )
}

export default function App() {
  const { pathname, hash } = useLocation()
  const navigate = useNavigate()

  // Kridhya-style global handler: a recovery (password-reset) email link must reach the
  // reset flow no matter which page its base URL lands on — the SPA serves every path,
  // so redirect anywhere→/account/reset preserving the link params. This covers both
  // Supabase's implicit flow (?token_hash=…) and PKCE flow (?code=…) recovery links,
  // keyed off type=recovery so it works either way.
  useEffect(() => {
    const q = new URLSearchParams(window.location.search)
    const h = new URLSearchParams(window.location.hash.replace(/^#/, ''))
    const type = q.get('type') || h.get('type')
    const link = linkFromUrl()
    const isRecovery = type === 'recovery' && (link.tokenHash || q.get('code') || h.get('code'))
    if (isRecovery && !pathname.startsWith('/account/reset')) {
      const search = new URLSearchParams()
      if (type) search.set('type', type)
      if (link.tokenHash) search.set('token_hash', link.tokenHash)
      const c = q.get('code') || h.get('code')
      if (c) search.set('code', c)
      navigate({ pathname: '/account/reset', search: `?${search.toString()}` }, { replace: true })
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
        <Suspense fallback={<RouteFallback />}>
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
        </Suspense>
        {showFooter && <Footer />}
        <CartDrawer />
        <AuthToast />
      </CartProvider>
    </AuthProvider>
  )
}
