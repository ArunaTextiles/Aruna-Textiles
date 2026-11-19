import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Hero from '../components/Hero'
import Dock from '../components/Dock'
import Journey from '../components/Journey'
import Gallery from '../components/Gallery'
import Lightbox, { type LbMedia } from '../components/Lightbox'
import Reveal from '../components/Reveal'
import { Socials } from '../components/Icons'
import { categories, craftSteps, infraStrip, promises, showcase, vm2Cards, workshopClips } from '../data/sections'

export default function Home() {
  const [lb, setLb] = useState<{ items: LbMedia[]; index: number; video?: string } | null>(null)
  const setLbIndex = (i: number) => setLb((p) => (p ? { ...p, index: i } : p))
  const openImages = (items: LbMedia[], index: number) => setLb({ items, index, video: undefined })
  const openVideo = (src: string) => setLb({ items: [], index: 0, video: src })

  // reveals for .rv / .rv-img (static nodes not wrapped by <Reveal>)
  useEffect(() => {
    const io = new IntersectionObserver(
      (es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target) } }),
      { rootMargin: '0px 0px -8% 0px' },
    )
    document.querySelectorAll('.rv, .rv-img').forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [])

  // count-up for infrastructure numbers
  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const io = new IntersectionObserver(
      (es) => es.forEach((e) => {
        if (!e.isIntersecting) return
        io.unobserve(e.target)
        const el = e.target as HTMLElement
        const to = Number(el.dataset.count || 0)
        const suf = el.dataset.suffix || ''
        const t0 = performance.now()
        const d = 1600
        const tick = (t: number) => {
          const p = Math.min((t - t0) / d, 1)
          el.textContent = Math.round(to * (1 - Math.pow(1 - p, 3))).toLocaleString('en-IN') + suf
          if (p < 1) requestAnimationFrame(tick)
        }
        requestAnimationFrame(tick)
      }),
      { threshold: 0.6 },
    )
    document.querySelectorAll('[data-count]').forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [])

  // muted loop videos: load + play only when visible
  useEffect(() => {
    const vids = [...document.querySelectorAll('video.loop')] as HTMLVideoElement[]
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const io = new IntersectionObserver(
      (es) => es.forEach((e) => {
        const v = e.target as HTMLVideoElement
        if (e.isIntersecting) {
          if (!v.getAttribute('src')) v.src = v.dataset.src || ''
          v.play().catch(() => {})
        } else if (!v.paused) v.pause()
      }),
      { rootMargin: '200px 0px' },
    )
    vids.forEach((v) => io.observe(v))
    return () => io.disconnect()
  }, [])

  const goCustomize = () => document.querySelector<HTMLElement>('button.nav-customize')?.click()

  return (
    <>
      <Hero />
      <Dock />

      <main>
        {/* Shop by technique */}
        <section className="sec wrap" id="products">
          <Reveal className="shead">
            <span className="kicker">OUR COLLECTIONS</span>
            <h2 className="h-lg">Shop by Technique</h2>
          </Reveal>
          <div className="cats">
            {categories.map((c, i) => (
              <Reveal key={c.t} as="div" className="cat" delay={i * 60}>
                <Link to={`/shop?cat=${c.t}`}>
                  <div className="cat-img">
                    <img className="a" src={c.a} alt={c.alt} loading="lazy" />
                    <img className="b" src={c.b} alt="" loading="lazy" />
                  </div>
                  <h3>{c.t}</h3>
                  <span className="more">Explore →</span>
                </Link>
              </Reveal>
            ))}
          </div>
        </section>

        {/* Finished pieces */}
        <section className="sec wrap" id="outcomes">
          <Reveal className="shead">
            <span className="kicker">FRESH OFF THE LOOM</span>
            <h2 className="h-lg">Finished Pieces</h2>
          </Reveal>
          <div className="showcase" data-lb>
            {showcase.map((s) => (
              <button
                key={s.cls}
                className={`${s.cls} zoom rv-img`}
                data-full={s.full}
                onClick={() => openImages(showcase.map((x) => ({ img: x.full, alt: x.alt })), showcase.indexOf(s))}
              >
                <img src={s.img} alt={s.alt} loading="lazy" />
                <span>{s.label}</span>
              </button>
            ))}
          </div>
          <Reveal className="center-cta">
            <Link className="btn" to="/shop">Shop the Collection</Link>
          </Reveal>
        </section>

        {/* About */}
        <section className="sec band" id="about">
          <div className="wrap about2">
            <Reveal img className="pair">
              <div className="zoom big">
                <img src="/images/hq/floral-teal-2000.webp" srcSet="/images/hq/floral-teal-1000.webp 1000w, /images/hq/floral-teal-2000.webp 2000w" sizes="(max-width:760px) 90vw, 40vw" alt="Artisans with a freshly finished hand-tufted rug" loading="lazy" />
              </div>
              <div className="zoom small">
                <img src="/images/hq/tufting-blue-1000.webp" alt="Hand-tufting a blue and grey design" loading="lazy" />
              </div>
            </Reveal>
            <Reveal>
              <span className="kicker">WELCOME TO ARUNA TEXTILE</span>
              <h2 className="h-lg">Crafted with purpose, woven for the world</h2>
              <p className="lead">Tradition, craftsmanship and innovation — every piece finished by hand in our own India workshop.</p>
              <a href="#journey" className="link">Our Journey</a>
            </Reveal>
          </div>
          <div className="wrap feats">
            {[['Premium Quality', 'yarn', 'Bundles of dyed yarn'], ['Custom Designs', 'samples', 'Hand-tufted design samples'], ['Sustainable Practices', 'charkha', 'Artisan spinning on a charkha'], ['Global Reach', 'dispatch', 'Rugs loaded for export']].map(([cap, imgName, alt], i) => (
              <Reveal key={cap} as="figure" className="feat" delay={i * 70}>
                <div className="zoom"><img src={`/images/hq/${imgName}-1000.webp`} alt={alt} loading="lazy" /></div>
                <figcaption>{cap}</figcaption>
              </Reveal>
            ))}
          </div>
        </section>

        {/* Journey */}
        <Journey />

        {/* Craft */}
        <section className="sec wrap" id="craft">
          <Reveal className="shead">
            <span className="kicker">HOW WE WORK</span>
            <h2 className="h-lg">From Raw Yarn to Finished Carpet</h2>
          </Reveal>
          <ol className="steps2" aria-label="The six steps">
            {craftSteps.map((s, i) => (
              <Reveal key={s.n} as="li" className="step2" delay={i * 50}>
                <div className="zoom"><img src={`/images/hq/${s.img}-1000.webp`} alt={s.alt} loading="lazy" /></div>
                <b>{s.n}</b>
                <span>{s.label}</span>
              </Reveal>
            ))}
          </ol>
        </section>

        {/* Vision / Mission */}
        <section className="sec wrap vm2">
          {vm2Cards.map((c, i) => (
            <Reveal key={i} as="article" className="vm2-card" delay={i * 80}>
              <div className="zoom">
                <img src={c.big} srcSet={`${c.small} 1000w, ${c.big} 2000w`} sizes="(max-width:760px) 100vw, 50vw" alt={c.alt} loading="lazy" />
              </div>
              <span className="kicker">{c.kicker}</span>
              <h3>{c.h}</h3>
              <p>{c.p}</p>
            </Reveal>
          ))}
        </section>

        {/* Infrastructure */}
        <section className="sec wrap" id="infrastructure">
          <Reveal className="shead">
            <span className="kicker">INFRASTRUCTURE</span>
            <h2 className="h-lg">Complete In-House Workshop</h2>
          </Reveal>
          <Reveal className="nums">
            <div><b data-count="19000">19,000</b><span>Sq.ft working space</span></div>
            <div><b data-count="33" data-suffix="+">33+</b><span>Skilled artisans</span></div>
            <div><b data-count="10">10</b><span>Broadlooms</span></div>
            <div><b>2016</b><span>Since</span></div>
          </Reveal>
          <div className="strip">
            {infraStrip.map((s) => (
              <Reveal key={s.img} img>
                <div className="zoom"><img src={`/images/hq/${s.img}-1000.webp`} alt={s.alt} loading="lazy" /></div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* Workshop clips */}
        <section className="sec wrap" id="workshop">
          <Reveal className="shead">
            <span className="kicker">INSIDE THE WORKSHOP</span>
            <h2 className="h-lg">The Craft in Motion</h2>
          </Reveal>
          <div className="clips">
            {workshopClips.map((c) => (
              <Reveal key={c.n} as="figure" className="clip">
                <button className="reel" aria-label={`Play video: ${c.label}`} onClick={() => openVideo(`/video/${c.src}.mp4`)}>
                  <video className="loop" muted loop playsInline preload="none" poster={`/video/${c.src}.jpg`} data-src={`/video/${c.src}.mp4`} aria-hidden="true" />
                  <i>▶</i>
                </button>
                <figcaption><small>{c.n}</small>{c.label}</figcaption>
              </Reveal>
            ))}
          </div>
        </section>

        {/* Banner */}
        <section className="sec banner">
          <img src="/video/banner-crafted.jpg" alt="Cord being stitched into a rug by hand" loading="lazy" />
          <video className="loop" muted loop playsInline preload="none" poster="/video/banner-crafted.jpg" data-src="/video/banner-crafted.mp4" aria-hidden="true" />
        </section>

        {/* Commitment */}
        <section className="sec band" id="commitment">
          <div className="wrap">
            <Reveal className="shead">
              <span className="kicker">OUR COMMITMENT</span>
              <h2 className="h-lg">No Compromise on Anything</h2>
            </Reveal>
            <Reveal as="ol" className="promises">
              {promises.map((p, i) => (
                <li key={i}><b>{String(i + 1).padStart(2, '0')}</b><span>{p}</span></li>
              ))}
            </Reveal>
          </div>
        </section>

        {/* Gallery */}
        <section className="sec" id="gallery">
          <div className="wrap car-head">
            <div className="shead">
              <span className="kicker">GALLERY</span>
              <h2 className="h-lg">From Loom to Living Room</h2>
            </div>
          </div>
          <Gallery onOpen={openImages} />
        </section>

        {/* Customize CTA */}
        <section className="sec band custom-cta" id="custom">
          <div className="wrap about2 flip">
            <Reveal>
              <span className="kicker">MADE TO ORDER</span>
              <h2 className="h-lg">Design &amp; Customize Your Rug</h2>
              <p className="lead">Your size, colours and technique — made by hand.</p>
              <button type="button" className="btn" data-customize onClick={goCustomize}>Start Customizing</button>
            </Reveal>
            <Reveal img className="pair">
              <div className="zoom big">
                <img src="/images/hq/samples-1000.webp" alt="Custom hand-tufted design samples" loading="lazy" />
              </div>
              <div className="zoom small">
                <img src="/images/hq/yarn-1000.webp" alt="Dyed yarn ready for a custom order" loading="lazy" />
              </div>
            </Reveal>
          </div>
        </section>

        {/* Contact */}
        <section className="sec contact-hero" id="contact">
          <img className="contact-bg" src="/images/hq/maroon-still-1774.webp" srcSet="/images/hq/maroon-still-1000.webp 1000w, /images/hq/maroon-still-1774.webp 1774w" sizes="100vw" alt="" loading="lazy" aria-hidden="true" />
          <div className="contact2 wrap">
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
      </main>

      {lb && <Lightbox items={lb.items} index={lb.index} video={lb.video ? { src: lb.video } : null} onIndex={setLbIndex} onClose={() => setLb(null)} />}
    </>
  )
}
