import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { WhatsAppIcon } from './Icons'

// The original mobile quick-actions dock: appears after the hero scrolls away.
export default function Dock() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    const onScroll = () => {
      const hero = document.getElementById('home')
      setShow(window.scrollY > (hero ? hero.offsetHeight * 0.7 : 600))
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <nav className={`dock ${show ? 'show' : ''}`} id="dock" aria-label="Quick actions">
      <Link to="/shop" className="d-shop">Shop</Link>
      <a className="d-wa" href="https://wa.me/919999999999" aria-label="Chat on WhatsApp">
        <WhatsAppIcon />WhatsApp
      </a>
      <a className="d-up" href="#home" aria-label="Back to top">↑</a>
    </nav>
  )
}
