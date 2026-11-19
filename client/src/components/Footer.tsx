import { Link } from 'react-router-dom'
import { FacebookIcon, InstagramIcon, MailIcon, WhatsAppIcon } from './Icons'

// Original footer markup: .foot 4-column grid (brand / EXPLORE / SHOP / VISIT) + .foot-bottom.
export default function Footer() {
  return (
    <footer>
      <div className="wrap">
        <div className="foot">
          <div>
            <div className="brand">
              <img src="/images/brand/aruna-logo-clear.png" alt="Aruna Textile" className="brand-logo" />
              <span className="brand-tag">Woven to Endure</span>
            </div>
            <p>Handwoven rugs and carpets, crafted with skill — from broadloom to jacquard, every article finished entirely by hand.</p>
            <div className="socials">
              <a href="https://wa.me/919999999999" aria-label="WhatsApp"><WhatsAppIcon /></a>
              <a href="#" aria-label="Instagram"><InstagramIcon /></a>
              <a href="#" aria-label="Facebook"><FacebookIcon /></a>
              <a href="mailto:hello@arunatextile.in" aria-label="Email"><MailIcon /></a>
            </div>
          </div>

          <div>
            <h5>EXPLORE</h5>
            <a href="#products">Collections</a>
            <a href="#about">About</a>
            <a href="#journey">Our Journey</a>
            <a href="#craft">Our Craft</a>
            <a href="#gallery">Gallery</a>
            <a href="#contact">Contact</a>
          </div>

          <div>
            <h5>SHOP</h5>
            <Link to="/shop">All Collections</Link>
            <Link to="/shop?cat=Jacquard">Jacquard Carpets</Link>
            <Link to="/shop?cat=Handtufted">Handtufted Articles</Link>
          </div>

          <div>
            <h5>VISIT</h5>
            <a href="#contact">Near Jain Jutta Factory</a>
            <a href="#contact">Tej Vihar Colony, Babail Road</a>
            <a href="#contact">India (HR) 132103, India</a>
          </div>
        </div>

        <div className="foot-bottom">
          <span>© 2026 Aruna Textile. All rights reserved.</span>
          <span>Tradition × Innovation × Sustainability</span>
        </div>
      </div>
    </footer>
  )
}
