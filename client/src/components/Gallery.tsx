import { useEffect, useRef } from 'react'
import { gallery } from '../data/sections'
import type { LbMedia } from './Lightbox'

// Port of the original gallery: native snap carousel with mouse-drag, arrows,
// a progress bar, cloned slides and a slow infinite glide that pauses on hover.
export default function Gallery({ onOpen }: { onOpen: (items: LbMedia[], index: number) => void }) {
  const trackRef = useRef<HTMLDivElement>(null)
  const barRef = useRef<HTMLSpanElement>(null)
  const prevRef = useRef<HTMLButtonElement>(null)
  const nextRef = useRef<HTMLButtonElement>(null)

  const items: LbMedia[] = gallery.map((g) => ({ img: g.full, alt: g.alt }))

  useEffect(() => {
    const track = trackRef.current
    if (!track) return
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
    const bar = barRef.current
    const prev = prevRef.current
    const next = nextRef.current
    if (!bar || !prev || !next) return

    const slides = [...(track.children as HTMLCollection)].slice(0, gallery.length) as HTMLElement[]
    const step = () => (slides[1] ? slides[1].offsetLeft - slides[0].offsetLeft : track.clientWidth)
    const max = () => track.scrollWidth - track.clientWidth

    // clone one set so the loop never visibly rewinds
    if (!reduce) {
      slides.forEach((sl, n) => {
        const c = sl.cloneNode(true) as HTMLElement
        c.setAttribute('aria-hidden', 'true')
        c.tabIndex = -1
        c.classList.add('clone')
        c.onclick = () => sl.click()
        track.appendChild(c)
      })
      track.classList.add('glide')
    }

    const loopW = () => {
      const clone = track.children[slides.length] as HTMLElement | undefined
      return clone ? clone.offsetLeft - slides[0].offsetLeft : 0
    }

    const sync = () => {
      const m = max()
      const p = m > 0 ? track.scrollLeft / m : 0
      const vis = Math.min(1, track.clientWidth / track.scrollWidth)
      bar.style.width = vis * 100 + '%'
      bar.style.transform = `translateX(${p * (1 / vis - 1) * 100}%)`
      if (!track.classList.contains('glide')) {
        prev.disabled = track.scrollLeft < 4
        next.disabled = track.scrollLeft > m - 4
      }
    }

    const go = (dir: number) => track.scrollBy({ left: dir * step(), behavior: reduce ? 'auto' : 'smooth' })

    // mouse drag
    let down = false, moved = false, sx = 0, sl = 0
    const pd = (e: PointerEvent) => { if (e.pointerType !== 'mouse') return; down = true; moved = false; sx = e.clientX; sl = track.scrollLeft }
    const pm = (e: PointerEvent) => {
      if (!down) return
      const dx = e.clientX - sx
      if (!moved && Math.abs(dx) > 5) { moved = true; track.classList.add('drag') }
      if (moved) track.scrollLeft = sl - dx
    }
    const pu = () => {
      if (!down) return
      down = false
      if (moved) {
        track.classList.remove('drag')
        const st = step()
        track.scrollTo({ left: Math.round(track.scrollLeft / st) * st, behavior: reduce ? 'auto' : 'smooth' })
      }
    }
    track.addEventListener('pointerdown', pd)
    window.addEventListener('pointermove', pm)
    window.addEventListener('pointerup', pu)
    track.addEventListener('scroll', sync, { passive: true })
    window.addEventListener('resize', sync)

    // arrows (with glide nudge)
    let pauseUntil = 0
    const nudge = (dir: number) => {
      const L = loopW()
      if (dir < 0 && track.scrollLeft < step()) track.scrollLeft += L
      if (dir > 0 && track.scrollLeft > L) track.scrollLeft -= L
      pauseUntil = performance.now() + 2600
      go(dir)
    }
    prev.onclick = () => (track.classList.contains('glide') ? nudge(-1) : go(-1))
    next.onclick = () => (track.classList.contains('glide') ? nudge(1) : go(1))
    track.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') { e.preventDefault(); next.click() }
      if (e.key === 'ArrowLeft') { e.preventDefault(); prev.click() }
    })

    // slow infinite glide
    let hold = false, last = 0, pos = track.scrollLeft
    const SPEED = 26
    const frame = (t: number) => {
      const dt = last ? Math.min(64, t - last) / 1000 : 0
      last = t
      const r = track.getBoundingClientRect()
      const seen = r.bottom > 0 && r.top < innerHeight
      if (track.classList.contains('glide') && !hold && seen && !down && !document.hidden && t > pauseUntil) {
        pos += SPEED * dt
        const L = loopW()
        if (L > 0 && pos >= L) pos -= L
        track.scrollLeft = pos
      } else pos = track.scrollLeft
      requestAnimationFrame(frame)
    }
    requestAnimationFrame(frame)
    ;['pointerenter', 'focusin', 'touchstart'].forEach((ev) =>
      track.addEventListener(ev, () => { hold = true }, { passive: true }),
    )
    ;['pointerleave', 'focusout'].forEach((ev) =>
      track.addEventListener(ev, () => { hold = false }, { passive: true }),
    )
    track.addEventListener('touchend', () => { pauseUntil = performance.now() + 3500; hold = false }, { passive: true })

    // click a slide -> lightbox
    const click = (e: MouseEvent) => {
      if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; return }
      const btn = (e.target as HTMLElement).closest('.car-slide') as HTMLElement | null
      if (!btn) return
      const real = [...(track.children as HTMLCollection)]
      const idx = real.indexOf(btn) % slides.length
      onOpen(items, idx)
    }
    track.addEventListener('click', click, true)

    sync()
    return () => {
      track.removeEventListener('pointerdown', pd)
      window.removeEventListener('pointermove', pm)
      window.removeEventListener('pointerup', pu)
      window.removeEventListener('resize', sync)
      track.removeEventListener('click', click, true)
    }
  }, [onOpen])

  return (
    <>
      <div className="car" data-lb>
        <div className="car-track" tabIndex={0} role="region" aria-label="Gallery — swipe, drag or use the arrows">
          {gallery.map((g, i) => (
            <button
              key={i}
              className="car-slide"
              aria-label={`View photo: ${g.alt}`}
              onClick={() => onOpen(items, i)}
            >
              <img src={g.img} alt={g.alt} loading="lazy" draggable={false} />
            </button>
          ))}
        </div>
      </div>
      <div className="wrap car-ctrl">
        <button type="button" className="car-btn" ref={prevRef} aria-label="Previous photos">←</button>
        <div className="car-bar" aria-hidden="true"><i ref={barRef} /></div>
        <button type="button" className="car-btn" ref={nextRef} aria-label="Next photos">→</button>
      </div>
    </>
  )
}
