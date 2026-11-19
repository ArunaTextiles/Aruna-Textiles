import { useEffect, useRef, useState, type ReactNode, type ElementType } from 'react'

// Renders the given tag and applies the original .rv / .rv-img reveal class
// (adds .in when scrolled into view). This IS the element — put the content inside.
export default function Reveal({
  as: Tag = 'div',
  img = false,
  className = '',
  delay = 0,
  children,
}: {
  as?: ElementType
  img?: boolean
  className?: string
  delay?: number
  children: ReactNode
}) {
  const ref = useRef<HTMLElement>(null)
  const [inView, setIn] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setIn(true)
          io.disconnect()
        }
      },
      { rootMargin: '0px 0px -8% 0px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  const base = img ? 'rv-img' : 'rv'
  return (
    <Tag ref={ref as never} className={`${base} ${className} ${inView ? 'in' : ''}`} style={delay ? { transitionDelay: `${delay}ms` } : undefined}>
      {children}
    </Tag>
  )
}
