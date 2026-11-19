import { useEffect, useState, type FormEvent } from 'react'

// Right-side made-to-order drawer — reproduces the original <dialog class="cz">.
const ENQUIRY_EMAIL = (import.meta.env.VITE_ENQUIRY_EMAIL as string) || ''
const WHATSAPP_NUMBER = (import.meta.env.VITE_WHATSAPP_NUMBER as string) || ''

type Radio = string
interface Row {
  label: string
  value: string
  wide?: boolean
  as?: 'text' | 'number' | 'select' | 'textarea'
  options?: string[]
  placeholder?: string
  required?: boolean
  min?: number
  inputMode?: 'text' | 'decimal' | 'numeric'
}

const SIZE_ROW: Row[] = [
  { label: 'Width', value: '', placeholder: 'e.g. 5', inputMode: 'decimal' },
  { label: 'Length', value: '', placeholder: 'e.g. 8', inputMode: 'decimal' },
  { label: 'Unit', value: 'ft', as: 'select', options: ['ft', 'cm', 'm'] },
  { label: 'Quantity', value: '1', as: 'number', min: 1 },
  { label: 'Material', value: 'Wool', as: 'select', options: ['Wool', 'Cotton', 'Jute', 'Viscose', 'Polyester', 'Blend', 'Not sure'] },
  { label: 'Project', value: 'Home', as: 'select', options: ['Home', 'Hospitality', 'Retail / Wholesale', 'Office', 'Other'] },
  { label: 'Colours', value: '', wide: true, placeholder: 'e.g. ivory, sage, terracotta' },
  { label: 'Design idea', value: '', wide: true, as: 'textarea', placeholder: 'Pattern, texture, a reference link…' },
]

const DETAILS_ROW: Row[] = [
  { label: 'Name *', value: '', required: true },
  { label: 'Email *', value: '', required: true },
  { label: 'Phone / WhatsApp', value: '' },
  { label: 'Country', value: '' },
]

const RADIO_GROUPS: { name: string; legend: string; options: string[]; default?: string }[] = [
  { name: 'technique', legend: 'Technique', options: ['Handtufted', 'Pitloom', 'Braided', 'Broadloom', 'Jacquard', 'Not sure'], default: 'Handtufted' },
  { name: 'shape', legend: 'Shape', options: ['Rectangle', 'Round', 'Runner', 'Oval', 'Custom'], default: 'Rectangle' },
]

export default function CustomizeDrawer({ onClose }: { onClose: () => void }) {
  const [done, setDone] = useState(false)
  const [busy, setBusy] = useState(false)
  const [radios, setRadios] = useState<Record<string, string>>(
    Object.fromEntries(RADIO_GROUPS.map((g) => [g.name, g.default || g.options[0]])),
  )
  const [values, setValues] = useState<Record<string, string>>({})
  const [bad, setBad] = useState<Record<string, boolean>>({})

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    document.body.classList.add('cz-open')
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.classList.remove('cz-open')
    }
  }, [onClose])

  const set = (k: string, v: string) => {
    setValues((p) => ({ ...p, [k]: v }))
    setBad((p) => ({ ...p, [k]: false }))
  }

  const buildMessage = () => {
    const lines: string[] = []
    RADIO_GROUPS.forEach((g) => lines.push(`${g.legend}: ${radios[g.name]}`))
    const size = [values.Width, values.Length].filter(Boolean).join(' x ')
    SIZE_ROW.forEach((r) => {
      if (r.as === 'number' || r.as === 'select') { if (values[r.label]) lines.push(`${r.label}: ${values[r.label]}`) }
      else if (values[r.label]?.trim()) lines.push(`${r.label}: ${values[r.label].trim()}`)
    })
    if (size) lines.splice(1, 0, `Size: ${size} ${values.Unit || ''}`)
    DETAILS_ROW.forEach((r) => { if (values[r.label]?.trim()) lines.push(`${r.label.replace(' *', '')}: ${values[r.label].trim()}`) })
    return 'Hello Aruna Textile,\n\nI would like a custom rug:\n\n' + lines.join('\n') + '\n\nThank you.'
  }

  const submit = async (e: FormEvent, via: 'email' | 'whatsapp') => {
    e.preventDefault()
    const first = Object.entries(bad).find(([k, v]) => v && k in bad)?.[0]
    if (first) { document.getElementById(`cz-${first}`)?.focus(); return }
    setBusy(true)
    const payload: Record<string, string> = { ...values }
    RADIO_GROUPS.forEach((g) => (payload[g.legend] = radios[g.name]))
    const name = values['Name *'] || values.Name || ''
    const email = values['Email *'] || values.Email || ''

    try {
      const res = await fetch('/api/custom-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          technique: payload.Technique, shape: payload.Shape, width: values.Width, length: values.Length,
          unit: values.Unit, quantity: values.Quantity, material: values.Material, project: values.Project,
          colours: values.Colours, idea: values['Design idea'], name, email,
          phone: values['Phone / WhatsApp'], country: values.Country,
        }),
      })
      if (res.ok) {
        if (via === 'whatsapp' && WHATSAPP_NUMBER) {
          window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(buildMessage())}`, '_blank', 'noopener')
        } else if (via === 'email' && ENQUIRY_EMAIL) {
          window.location.href = `mailto:${ENQUIRY_EMAIL}?subject=${encodeURIComponent('Custom rug request - ' + name)}&body=${encodeURIComponent(buildMessage())}`
        }
        setDone(true)
      } else {
        // no backend reachable — still hand the customer a ready WhatsApp message
        if (via === 'whatsapp') window.open(`https://wa.me/${WHATSAPP_NUMBER || '919999999999'}?text=${encodeURIComponent(buildMessage())}`, '_blank', 'noopener')
        setDone(true)
      }
    } catch {
      if (via === 'whatsapp') window.open(`https://wa.me/${WHATSAPP_NUMBER || '919999999999'}?text=${encodeURIComponent(buildMessage())}`, '_blank', 'noopener')
      setDone(true)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="cz-scrim" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="cz" role="dialog" aria-modal="true" aria-labelledby="czTitle">
        <div className="cz-art" aria-hidden="true">
          <img src="/images/hq/maroon-still-1000.webp" srcSet="/images/hq/maroon-still-1000.webp 1000w, /images/hq/maroon-still-1774.webp 1774w" sizes="(max-width:760px) 100vw, 40vw" alt="" loading="lazy" />
          <div className="cz-art-cap">
            <span>Aruna Textile</span>
            <p>Your size. Your colours.<br />Woven by hand.</p>
          </div>
        </div>

        <form className="cz-form" noValidate onSubmit={(e) => submit(e, 'email')}>
          <button type="button" className="cz-x" onClick={onClose} aria-label="Close">✕</button>

          <div className="cz-step" style={done ? { display: 'none' } : undefined}>
            <header className="cz-head">
              <span className="kicker">MADE TO ORDER</span>
              <h2 id="czTitle">Customize <em>your rug</em></h2>
            </header>

            <div className="cz-sec">
              <h3 className="cz-sh"><i>01</i>The rug</h3>
              {RADIO_GROUPS.map((g) => (
                <fieldset key={g.name} style={{ border: 0 }}>
                  <legend style={{ padding: 0, fontSize: 13, color: 'var(--ink-soft)', marginBottom: 8 }}>{g.legend}</legend>
                  <div className="chips-in">
                    {g.options.map((o) => (
                      <label key={o}>
                        <input type="radio" name={g.name} value={o} checked={radios[g.name] === o} onChange={() => setRadios((p) => ({ ...p, [g.name]: o }))} />
                        <span>{o}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>
              ))}
            </div>

            <div className="cz-sec">
              <h3 className="cz-sh"><i>02</i>Size &amp; style</h3>
              <div className="cz-grid">
                {SIZE_ROW.map((r) => (
                  <Field key={r.label} row={r} value={values[r.label] || ''} id={`cz-${r.label}`} bad={!!bad[r.label]} onChange={(v) => set(r.label, v)} />
                ))}
              </div>
            </div>

            <div className="cz-sec">
              <h3 className="cz-sh"><i>03</i>Your details</h3>
              <div className="cz-grid">
                {DETAILS_ROW.map((r) => (
                  <Field key={r.label} row={r} value={values[r.label] || ''} id={`cz-${r.label}`} bad={!!bad[r.label]} onChange={(v) => set(r.label, v)} />
                ))}
              </div>
            </div>

            <div className="cz-actions">
              <button type="submit" className="btn" value="email" disabled={busy}>Send Request</button>
              <button type="button" className="btn wa-btn" value="whatsapp" onClick={(e) => submit(e as unknown as FormEvent, 'whatsapp')} disabled={busy}>Send on WhatsApp</button>
            </div>
          </div>

          <div className="cz-done" hidden={!done}>
            <span className="kicker">THANK YOU</span>
            <h2>We’ll be <em>in touch</em></h2>
            <p className="lead">Your request is ready in your email or WhatsApp — just press send.</p>
            <button type="button" className="btn" onClick={onClose}>Close</button>
          </div>
        </form>
      </div>
    </div>
  )
}

function Field({ row, value, id, bad, onChange }: { row: Row; value: string; id: string; bad: boolean; onChange: (v: string) => void }) {
  const cls = `f${row.wide ? ' wide' : ''}${bad ? ' bad' : ''}`
  if (row.as === 'select')
    return (
      <label className={cls}>
        <span>{row.label}</span>
        <select value={value} onChange={(e) => onChange(e.target.value)}>
          {(row.options || []).map((o) => <option key={o}>{o}</option>)}
        </select>
      </label>
    )
  if (row.as === 'textarea')
    return (
      <label className={cls}>
        <span>{row.label}</span>
        <textarea id={id} rows={3} value={value} placeholder={row.placeholder} onChange={(e) => onChange(e.target.value)} />
      </label>
    )
  return (
    <label className={cls}>
      <span>{row.label}</span>
      <input
        id={id}
        value={value}
        type={row.as === 'number' ? 'number' : 'text'}
        inputMode={row.inputMode}
        placeholder={row.placeholder}
        min={row.min}
        required={row.required}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  )
}
