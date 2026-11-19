import { useEffect, useRef, useState } from 'react'
import { heroSlides } from '../data/sections'

// Faithful port of the original <header class="hero">: 5 crossfading slides,
// progress-bar dots, auto-advance + touch swipe. h1 stays visually hidden (original design).
export default function Hero() {
  const [i, setI] = useState(0)
  const [reduce, setReduce] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout>>()
  const heroRef = useRef<HTMLElement>(null)

  const show = (n: number) => setI((n + heroSlides.length) % heroSlides.length)

  useEffect(() => {
    setReduce(matchMedia('(prefers-reduced-motion: reduce)').matches)
  }, [])

  // auto-advance (pauses while the tab is hidden, like the original)
  useEffect(() => {
    if (reduce) return
    timer.current = setTimeout(() => show(i + 1), 6000)
    return () => clearTimeout(timer.current)
  }, [i, reduce])

  useEffect(() => {
    const el = heroRef.current
    if (!el) return
    const onVis = () => {
      if (document.hidden) clearTimeout(timer.current)
      else {
        clearTimeout(timer.current)
        timer.current = setTimeout(() => show(i + 1), 6000)
      }
    }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [i, reduce])

  // swipe
  const tx = useRef<number | null>(null)
  const ty = useRef(0)

  return (
    <header
      className="hero"
      id="home"
      onTouchStart={(e) => { tx.current = e.touches[0].clientX; ty.current = e.touches[0].clientY }}
      onTouchEnd={(e) => {
        if (tx.current === null) return
        const dx = e.changedTouches[0].clientX - tx.current
        const dy = e.changedTouches[0].clientY - ty.current
        tx.current = null
        if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.4) show(dx < 0 ? i + 1 : i - 1)
      }}
    >
      {heroSlides.map((s, idx) => (
        <div key={idx} className={`slide ${idx === i ? 'on' : ''}`}>
          <img
            src={s.big}
            srcSet={`${s.small} 1000w, ${s.big} 1774w`}
            sizes="100vw"
            alt={s.alt}
            style={{ objectPosition: s.pos }}
            fetchPriority={idx === 0 ? 'high' : 'auto'}
            loading={idx <= 1 ? 'eager' : 'lazy'}
          />
        </div>
      ))}

      <h1 className="vh">Aruna Textile: handmade rugs and carpets</h1>

      <div className="hero-dots" role="group" aria-label="Choose slide">
        {heroSlides.map((_, idx) => (
          <button key={idx} type="button"
            className={idx === i ? 'on' : idx < i ? 'done' : ''}
            aria-label={`Show slide ${idx + 1}`}
            aria-current={idx === i}
            onClick={() => show(idx)}>
            <i />
          </button>
        ))}
      </div>
    </header>
  )
}
