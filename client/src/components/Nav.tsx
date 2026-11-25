import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import CustomizeDrawer from './CustomizeDrawer'
import { useAuth } from '../context/AuthContext'

// Mirrors the original split nav: left links · centred brand · right links.
// Anchor items scroll on the home page, otherwise they deep-link to /#section.
function useSectionNav() {
  const loc = useLocation()
  const nav = useNavigate()
  return (to: string) => {
    const [path, hash] = to.split('#')
    if (loc.pathname === '/' && !path) {
      document.querySelector(hash ? `#${hash}` : to)?.scrollIntoView({ behavior: 'smooth' })
      return
    }
    nav(`/${path}${hash ? `#${hash}` : ''}`)
  }
}

const PersonIcon = ({ big }: { big?: boolean }) => {
  const s = big ? 26 : 20
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 4-6 8-6s8 2 8 6" />
    </svg>
  )
}

export default function Nav() {
  const [menu, setMenu] = useState(false)
  const [customize, setCustomize] = useState(false)
  const [solid, setSolid] = useState(true)
  const go = useSectionNav()
  const { pathname } = useLocation()
  const { user, ready } = useAuth()
  // signed-in: show the account's initials; not signed in: a person icon
  const initials = (user?.name || user?.email || '')
    .split(/[\s.@]+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase()
  // only pages that open with a dark banner image get the dark header vignette
  const banner = pathname.startsWith('/shop') || pathname === '/'

  useEffect(() => {
    // Banner pages (home, shop) start transparent over the dark photo and turn solid on scroll.
    // Every other page (account, checkout, cart, …) is light, so the solid ivory header is
    // always on there — otherwise the cream nav text would be invisible on a white background.
    if (!banner) {
      setSolid(true)
      return
    }
    const update = () => setSolid(window.scrollY > 60)
    update()
    window.addEventListener('scroll', update, { passive: true })
    return () => window.removeEventListener('scroll', update)
  }, [pathname, banner])

  useEffect(() => {
    document.body.style.overflow = menu ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [menu])

  const closeMenu = () => setMenu(false)
  const openCustomize = () => { closeMenu(); setCustomize(true) }

  // expose the customize-drawer opener to the footer CTA via a custom event
  useEffect(() => {
    const h = (e: Event) => setCustomize((e as CustomEvent).detail !== false)
    window.addEventListener('aruna:customize', h)
    return () => window.removeEventListener('aruna:customize', h)
  }, [])

  const left = [
    { label: 'Collections', to: '#products' },
    { label: 'About', to: '#about' },
    { label: 'Our Journey', to: '#journey' },
    { label: 'Our Craft', to: '#craft' },
  ]
  const right = [
    { label: 'Gallery', to: '#gallery' },
    { label: 'Contact', to: '#contact' },
  ]

  return (
    <>
      <nav className={`nav ${solid ? 'solid' : banner ? 'clear' : ''}`} id="nav" aria-label="Main">
        <div className="nav-inner">
          <div className="nav-links">
            {left.map((l) => (
              <a key={l.label} href={`#${l.to.slice(1)}`} onClick={(e) => { e.preventDefault(); go(l.to) }}>{l.label}</a>
            ))}
          </div>

          <Link to="/" className="brand" aria-label="Aruna Textile — home">
            <img src="/images/brand/aruna-logo-clear.png" alt="Aruna Textile" className="brand-logo" />
            <span className="brand-tag">Woven to Endure</span>
          </Link>

          <div className="nav-right">
            <div className="nav-links">
              {right.map((l) => (
                <a key={l.label} href={`#${l.to.slice(1)}`} onClick={(e) => { e.preventDefault(); go(l.to) }}>{l.label}</a>
              ))}
              <button type="button" onClick={openCustomize} aria-label="Customize a rug" className="nav-customize">Customize</button>
              <Link to="/account" className="nav-account" aria-label={user ? `My account — ${user.email}` : 'Sign in'}>
                {user ? <span className="acct-ava">{initials || 'A'}</span> : <PersonIcon />}
              </Link>
              <Link to="/shop" className="mm-shop">Shop →</Link>
            </div>
            <button className="burger" aria-label="Open menu" aria-expanded={menu} aria-controls="mmenu" onClick={() => setMenu(true)}>
              <span /><span /><span />
            </button>
          </div>
        </div>
      </nav>

      <div className={`mmenu ${menu ? 'open' : ''}`} id="mmenu">
        <button className="x" aria-label="Close menu" onClick={closeMenu}>✕</button>
        <div className="mmenu-brand" aria-hidden="true">
          <img src="/images/brand/aruna-logo-clear.png" alt="Aruna Textile" />
          <span>Woven to Endure</span>
        </div>
        <a href="#home" onClick={(e) => { e.preventDefault(); closeMenu(); go('#home') }}>Home</a>
        {left.map((l) => (
          <a key={l.label} href={`#${l.to.slice(1)}`} onClick={(e) => { e.preventDefault(); go(l.to) }}>{l.label}</a>
        ))}
        {right.map((l) => (
          <a key={l.label} href={`#${l.to.slice(1)}`} onClick={(e) => { e.preventDefault(); go(l.to) }}>{l.label}</a>
        ))}
        <button type="button" onClick={openCustomize}>Customize</button>
        <Link to="/account" onClick={closeMenu} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 22 }}>
          {user ? <>My account — {user.name?.split(' ')[0] || user.email}</> : <>Sign in <PersonIcon big /></>}
        </Link>
        <Link to="/shop" className="mm-shop" onClick={closeMenu}>Shop →</Link>
      </div>

      {customize && (
        <CustomizeDrawer onClose={() => setCustomize(false)} />
      )}
    </>
  )
}