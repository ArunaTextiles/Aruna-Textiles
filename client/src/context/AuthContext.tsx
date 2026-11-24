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

  // Subscribe to live auth changes (sign-in on another tab, OTP confirm, magic link, …).
  const listen = useCallback(() => {
    if (!hasSupabase || listening.current) return
    listening.current = true
    sub = supabase().auth.onAuthStateChange((_e, s) => {
      setUserRaw(toAuthUser(s?.user))
    })
  }, [])

  // Initial session + start listening.
  useEffect(() => {
    if (!hasSupabase) {
      setLoading(false)
      return
    }
    supabase()
      .auth.getSession()
      .then(({ data }) => {
        setUserRaw(toAuthUser(data.session?.user))
        setLoading(false)
      })
    listen()

    // Confirm-signup / magic links land on the page the user was on when they signed up
    // (e.g. ?token_hash=…&type=signup). Verify the link, sign them in, then strip the
    // token from the address bar so a refresh doesn't re-consume it.
    const link = linkFromUrl()
    if (link.tokenHash && ['signup', 'email', 'magiclink', 'invite', 'email_change'].includes(link.type || '')) {
      verifyEmailLink(link.tokenHash, link.type || 'signup')
        .then((u) => { if (u) setUserRaw(toAuthUser(u)) })
        .catch(() => { /* the Account page shows the friendly message via linkFromUrl() */ })
    }
    return () => sub?.data.subscription.unsubscribe()
  }, [listen])

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
