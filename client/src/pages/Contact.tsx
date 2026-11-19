import { Link } from 'react-router-dom'
import { Socials } from '../components/Icons'

// Matches the original #contact section exactly (.contact-hero + .contact2).
export default function Contact() {
  return (
    <section className="sec contact-hero" id="contact">
      <img
        className="contact-bg"
        src="/images/hq/maroon-still-1774.webp"
        srcSet="/images/hq/maroon-still-1000.webp 1000w, /images/hq/maroon-still-1774.webp 1774w"
        sizes="100vw"
        alt=""
        loading="lazy"
        aria-hidden="true"
      />
      <div className="contact2 wrap rv in">
        <span className="kicker">GET IN TOUCH</span>
        <h2 className="h-lg">Let’s Weave Something Together</h2>
        <p className="lead">Near Jain Jutta Factory, Tej Vihar Colony, Babail Road, India (HR) 132103</p>
        <div className="contact2-cta">
          <Link to="/shop" className="btn">Browse the Shop</Link>
          <a href="https://wa.me/919999999999" target="_blank" rel="noreferrer" className="btn ghost-dark">WhatsApp Us</a>
          <a href="mailto:hello@arunatextile.in" className="btn ghost-dark">Email Us</a>
        </div>
        <Socials />
      </div>
    </section>
  )
}
