export function WhatsAppIcon() {
  return (
    <svg className="si" viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="currentColor">
      <path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.16-.17.2-.35.22-.64.07-.3-.15-1.26-.46-2.39-1.47-.88-.79-1.48-1.76-1.65-2.06-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.61-.92-2.21-.24-.58-.49-.5-.67-.51l-.57-.01c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.21 3.07c.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.63.71.23 1.36.2 1.87.12.57-.09 1.76-.72 2.01-1.41.25-.69.25-1.29.17-1.41-.07-.12-.27-.2-.57-.35m-5.42 7.4h-.01a9.87 9.87 0 0 1-5.03-1.38l-.36-.21-3.74.98 1-3.65-.24-.37a9.86 9.86 0 0 1-1.51-5.26c0-5.45 4.44-9.88 9.89-9.88a9.82 9.82 0 0 1 6.99 2.9 9.83 9.83 0 0 1 2.89 6.99c0 5.45-4.44 9.88-9.88 9.88m8.41-18.3A11.82 11.82 0 0 0 12.05 0C5.5 0 .16 5.34.16 11.89c0 2.1.55 4.14 1.59 5.95L.06 24l6.3-1.65a11.88 11.88 0 0 0 5.68 1.45h.01c6.55 0 11.89-5.34 11.89-11.89a11.82 11.82 0 0 0-3.48-8.41Z" />
    </svg>
  )
}

export function InstagramIcon() {
  return (
    <svg className="si" viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="3.6" />
      <circle cx="17.4" cy="6.6" r="0.8" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function FacebookIcon() {
  return (
    <svg className="si" viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="currentColor">
      <path d="M14 8.5V6.8c0-.7.5-1 1-1h1.6V3H13c-2.4 0-4 1.6-4 4v1.5H7v3h2V21h3.5v-10H15l.5-3H14Z" />
    </svg>
  )
}

export function MailIcon() {
  return (
    <svg className="si" viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </svg>
  )
}

export function Socials({ wa = '#', ig = '#', fb = '#', email = 'mailto:hello@arunatextile.in' }: { wa?: string; ig?: string; fb?: string; email?: string }) {
  return (
    <div className="socials">
      <a href={wa} aria-label="WhatsApp"><WhatsAppIcon /></a>
      <a href={ig} aria-label="Instagram"><InstagramIcon /></a>
      <a href={fb} aria-label="Facebook"><FacebookIcon /></a>
      <a href={email} aria-label="Email"><MailIcon /></a>
    </div>
  )
}
