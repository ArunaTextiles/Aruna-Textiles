import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import CustomizeDrawer from './CustomizeDrawer'

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

export default function Nav() {
  const [menu, setMenu] = useState(false)
  const [customize, setCustomize] = useState(false)
  const [solid, setSolid] = useState(true)
  const go = useSectionNav()
  const { pathname } = useLocation()
  // only pages that open with a dark banner image get the dark header vignette
  const banner = pathname.startsWith('/shop') || pathname === '/'

  useEffect(() => {
    setSolid(window.scrollY > 60)
    const onScroll = () => setSolid(window.scrollY > 60)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [pathname])

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
        <Link to="/shop" className="mm-shop" onClick={closeMenu}>Shop →</Link>
      </div>

      {customize && (
        <CustomizeDrawer onClose={() => setCustomize(false)} />
      )}
    </>
  )
}