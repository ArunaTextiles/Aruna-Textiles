import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { journey } from '../data/sections'

gsap.registerPlugin(ScrollTrigger)

// Port of the original "Our Journey" story: a charakha wheel that turns with scroll,
// a thread that grows down the milestones, and chapters that light up as you pass them.
export default function Journey() {
  const secRef = useRef<HTMLElement>(null)
  const listRef = useRef<HTMLOListElement>(null)

  useEffect(() => {
    const sec = secRef.current
    if (!sec) return
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
    const wheel = sec.querySelector('.charakha-wheel') as HTMLElement | null
    const figure = sec.querySelector('.charakha') as HTMLElement | null
    const list = listRef.current
    const items = [...list.querySelectorAll('.milestone')] as HTMLElement[]
    const stops = journey.map((m) => m.at)
    const TURNS = 2

    // physical position of each milestone dot, so the thread reaches a dot exactly
    // when that chapter is revealed (same piecewise fill as the original). Re-measured
    // on resize / rebuild, like the original.
    let marks: number[] = []
    let span = 1
    const measure = () => {
      marks = items.map((el) => {
        const dot = el.querySelector('.ms-dot') as HTMLElement | null
        return el.offsetTop + (dot ? dot.offsetTop + dot.offsetHeight / 2 : 0)
      })
      span = (marks[marks.length - 1] - marks[0]) || 1
      // give the .ms-track its real top + height so the brown progress line shows
      list.style.setProperty('--t0', marks[0] + 'px')
      list.style.setProperty('--tlen', span + 'px')
    }

    const render = (p: number) => {
      if (wheel) wheel.style.setProperty('--rotation', (p * 360 * TURNS).toFixed(2) + 'deg')
      let cur = -1
      for (let i = 0; i < stops.length; i++) if (p >= stops[i]) cur = i
      items.forEach((el, i) => {
        el.classList.toggle('is-on', i <= cur)
        el.classList.toggle('is-current', i === cur)
      })
      // thread fill
      let f = 0
      if (p >= stops[stops.length - 1]) f = 1
      else if (p > stops[0]) {
        for (let i = 0; i < stops.length - 1; i++) {
          if (p < stops[i + 1]) {
            const k = (p - stops[i]) / (stops[i + 1] - stops[i])
            f = ((marks[i] - marks[0]) + k * (marks[i + 1] - marks[i])) / span
            break
          }
        }
      }
      list.style.setProperty('--tp', f.toFixed(4))
    }

    if (reduce || !sec) {
      measure()
      render(1)
      return
    }
    measure()
    render(0)

    const navH = 64
    const state = { p: 0 }
    let tween: gsap.core.Tween | null = null
    let builtWidth = 0

    const build = () => {
      tween?.scrollTrigger?.kill()
      tween?.kill()
      tween = null
      measure()
      const room = window.innerHeight - navH - 12
      sec.style.minHeight = ''
      const h = sec.offsetHeight
      const stageTop = Math.min(figure?.offsetTop || 0, list.offsetTop)
      const stageH = h - stageTop
      let st: { start: string; end?: string; pin: boolean }
      if (h <= room) {
        sec.style.minHeight = room + 'px'
        st = { start: `top ${navH + 6}px`, pin: true }
      } else if (stageH <= room) {
        st = { start: 'bottom bottom-=12', pin: true }
      } else {
        st = { start: 'top 75%', end: 'bottom 35%', pin: false }
      }
      const dist = Math.round(window.innerHeight * (window.innerWidth < 700 ? 1.15 : 1.4))
      tween = gsap.to(state, {
        p: 1,
        ease: 'none',
        onUpdate: () => render(state.p),
        scrollTrigger: {
          trigger: sec,
          start: st.start,
          end: st.end || `+=${dist}`,
          pin: st.pin,
          pinSpacing: true,
          anticipatePin: 1,
          scrub: 0.9,
          refreshPriority: 1,
        },
      })
      builtWidth = window.innerWidth
      ScrollTrigger.sort()
      ScrollTrigger.refresh()
    }

    build()
    let t: number
    window.addEventListener('resize', () => {
      clearTimeout(t)
      t = window.setTimeout(() => {
        if (window.innerWidth !== builtWidth) build()
        else ScrollTrigger.refresh()
      }, 200)
    })
    window.addEventListener('load', () => ScrollTrigger.refresh())

    return () => {
      tween?.scrollTrigger?.kill()
      tween?.kill()
    }
  }, [])

  return (
    <section className="sec journey" id="journey" ref={secRef}>
      <div className="wrap journey-inner">
        <div className="journey-top">
          <span className="kicker">SINCE 2016</span>
          <h2 className="h-lg">Our <em>Journey</em></h2>
          <p>From 2 broadlooms to a complete in-house workshop.</p>
        </div>

        <figure className="charakha" aria-hidden="true">
          <div className="charakha-glow" />
          <div className="charakha-shadow" />
          <img className="charakha-wheel" src="/images/hq/charakha-wheel.webp" alt="" draggable={false} />
          <svg className="charakha-band" viewBox="0 0 1470 978" preserveAspectRatio="none" focusable="false">
            <path
              d="M1260 557.25 L618.67 109.78 A362.5 362.5 0 0 1 621.58 702.3 L1148 640.28"
              fill="none" stroke="#B8A585" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" opacity={0.92}
            />
          </svg>
          <img className="charakha-frame" src="/images/hq/charakha-frame.webp" alt="" draggable={false} />
        </figure>

        <ol className="milestones" ref={listRef} aria-label="Our journey milestones">
          <li className="ms-track" aria-hidden="true"><span className="ms-fill" /></li>
          {journey.map((m) => (
            <li key={m.year} className="milestone" data-at={m.at}>
              <span className="ms-dot" aria-hidden="true" />
              <div className="ms-body">
                <span className="ms-year">{m.year}</span>
                <p>{m.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
