import { useEffect, useRef, useState, type TouchEvent } from 'react'

export interface LbMedia {
  img?: string
  alt?: string
  video?: string
}

// Matches the original .lb markup: full-bleed image viewer + an optional video
// mode, arrow/prev/next, counter, keyboard + swipe.
export default function Lightbox({ items, index, video, onIndex, onClose }: {
  items: LbMedia[]
  index: number
  video?: { src: string } | null
  onIndex: (i: number) => void
  onClose: () => void
}) {
  const [show, setShow] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const vidRef = useRef<HTMLVideoElement>(null)

  const isVid = !!video && !items.length
  const item = items[index]

  useEffect(() => {
    setShow(true)
    if (vidRef.current && video) vidRef.current.play().catch(() => {})
  }, [video])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (video) return
      if (e.key === 'ArrowRight') onIndex((index + 1) % items.length)
      if (e.key === 'ArrowLeft') onIndex((index - 1 + items.length) % items.length)
    }
    window.addEventListener('keydown', onKey)
    document.body.classList.add('cz-open')
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.classList.remove('cz-open')
    }
  }, [index, items.length, video, onClose, onIndex])

  // swipe
  const tx = useRef<number | null>(null)
  const onTouch = (e: React.TouchEvent, end: boolean) => {
    if (video) return
    if (end) {
      const dx = e.changedTouches[0].clientX - (tx.current || 0)
      tx.current = null
      if (Math.abs(dx) > 50) onIndex(dx < 0 ? (index + 1) % items.length : (index - 1 + items.length) % items.length)
    } else {
      tx.current = e.touches[0].clientX
    }
  }

  return (
    <div
      ref={rootRef}
      className={`lb ${show ? 'on' : ''} ${video ? 'vid' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label="Media viewer"
      onClick={(e) => { if (e.target === rootRef.current) onClose() }}
      onTouchStart={(e) => onTouch(e, false)}
      onTouchEnd={(e) => onTouch(e, true)}
    >
      <button className="x" onClick={onClose} aria-label="Close">✕</button>
      {!video && (
        <>
          <button className="pv" onClick={() => onIndex((index - 1 + items.length) % items.length)} aria-label="Previous">←</button>
          <img src={item?.img} alt={item?.alt || ''} />
          <button className="nx" onClick={() => onIndex((index + 1) % items.length)} aria-label="Next">→</button>
          <div className="lb-count">{index + 1} / {items.length}</div>
        </>
      )}
      {video && <video ref={vidRef} src={video.src} controls playsInline autoPlay />}
    </div>
  )
}
