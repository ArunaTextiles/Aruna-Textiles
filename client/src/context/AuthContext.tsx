import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { hasSupabase, supabase } from '../lib/supabase'
import { linkFromUrl, signOut as doSignOut, verifyEmailLink } from '../lib/auth'

export interface AuthUser {
  id: string
  email: string
  name?: string
}

// Shape the reference (Kridhya) checkout + SignIn consume: user, ready, ensure, setUser, signOut.
interface AuthCtx {
  user: AuthUser | null
  loading: boolean
  ready: boolean
  ensure: () => Promise<AuthUser | null>
  setUser: (u: AuthUser | null) => void
  signOut: () => Promise<void>
}

const Ctx = createContext<AuthCtx | null>(null)

const toAuthUser = (u: { id: string; email?: string } | null | undefined): AuthUser | null =>
  u ? { id: u.id, email: u.email || '', name: (u as { user_metadata?: { full_name?: string } }).user_metadata?.full_name } : null

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserRaw] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const listening = useRef(false)
  let sub: { data: { subscription: { unsubscribe: () => void } } } | undefined
  // fire the "you're signed in" notice at most once per link click
  const confirmed = useRef(false)

  // one-time read of the URL's auth-link params (signup / recovery / magic-link)
  const link = useMemo(() => linkFromUrl(), [])
  const isRecovery = !!(link.tokenHash && link.type === 'recovery')
  // arrived via a confirmation/magic link: an implicit-flow ?token_hash=… or a legacy ?code=…
  const cameFromLink = !!(link.tokenHash || /[?&#]code=/.test(window.location.href))

  const fireConfirmed = () => {
    if (confirmed.current) return
    confirmed.current = true
    window.dispatchEvent(new CustomEvent('aruna:auth-confirmed', { detail: { type: link.type } }))
  }
  const tidyUrl = () => {
    const url = new URL(window.location.href)
    ;['code', 'token_hash', 'type', 'error_code', 'error_description'].forEach((k) => url.searchParams.delete(k))
    window.history.replaceState(null, '', url.pathname + (url.search || ''))
  }

  // Subscribe to live auth changes (sign-in on another tab, OTP confirm, magic link, …).
  const listen = useCallback(() => {
    if (!hasSupabase || listening.current) return
    listening.current = true
    sub = supabase().auth.onAuthStateChange((e, s) => {
      setUserRaw(toAuthUser(s?.user))
      // implicit-flow confirmation links sign the user in here, in ANY browser/profile —
      // surface that with the toast and clean the URL so a refresh won't re-trigger it.
      if (e === 'SIGNED_IN' && cameFromLink && !isRecovery) {
        fireConfirmed()
        tidyUrl()
      }
    })
  }, [cameFromLink, isRecovery])

  // Initial session + start listening.
  useEffect(() => {
    if (!hasSupabase) {
      setLoading(false)
      return
    }
    supabase()
      .auth.getSession()
      .then(({ data }) => {
        const u = toAuthUser(data.session?.user)
        setUserRaw(u)
        setLoading(false)
        // already signed in via the link (detectSessionInUrl exchanged it on load): confirm it
        if (u && cameFromLink && !isRecovery) {
          fireConfirmed()
          tidyUrl()
        }
      })
    listen()

    // token_hash (implicit-flow) links: verify explicitly, then sign in + confirm.
    if (link.tokenHash && !isRecovery && ['signup', 'email', 'magiclink', 'invite', 'email_change'].includes(link.type || '')) {
      verifyEmailLink(link.tokenHash, link.type || 'signup')
        .then((u) => {
          if (u) {
            setUserRaw(toAuthUser(u))
            fireConfirmed()
            tidyUrl()
          }
        })
        .catch(() => { /* the Account page shows the friendly message via linkFromUrl() */ })
    }
    return () => sub?.data.subscription.unsubscribe()
  }, [listen, link, cameFromLink, isRecovery])

  const setUser = useCallback((u: AuthUser | null) => setUserRaw(u), [])

  // Load auth on demand (checkout / account) and start listening for sign-in.
  const ensure = useCallback(async () => {
    if (!hasSupabase) return null
    const { data } = await supabase().auth.getSession()
    const u = toAuthUser(data.session?.user)
    setUserRaw(u)
    setLoading(false)
    listen()
    return u
  }, [listen])

  const signOut = useCallback(async () => {
    await doSignOut()
    setUserRaw(null)
  }, [])

  const value = useMemo<AuthCtx>(
    () => ({ user, loading, ready: !loading, ensure, setUser, signOut }),
    [user, loading, ensure, setUser, signOut],
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export const useAuth = () => {
  const c = useContext(Ctx)
  if (!c) throw new Error('useAuth outside provider')
  return c
}
