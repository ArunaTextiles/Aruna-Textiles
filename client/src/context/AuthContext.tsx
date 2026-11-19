import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { hasSupabase, supabase } from '../lib/supabase'

export interface AuthUser {
  id: string
  email: string
  name?: string
}

interface AuthCtx {
  user: AuthUser | null
  loading: boolean
  signOut: () => Promise<void>
  sendOtp: (email: string) => Promise<void>
  verifyOtp: (email: string, code: string) => Promise<void>
}

const Ctx = createContext<AuthCtx | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!hasSupabase) {
      setLoading(false)
      return
    }
    const sb = supabase()
    sb.auth.getSession().then(({ data }) => {
      const u = data.session?.user
      setUser(u ? { id: u.id, email: u.email || '', name: (u.user_metadata?.full_name as string) } : null)
      setLoading(false)
    })
    const { data: sub } = sb.auth.onAuthStateChange((_e, s) => {
      const u = s?.user
      setUser(u ? { id: u.id, email: u.email || '', name: u.user_metadata?.full_name as string } : null)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  const sendOtp = async (email: string) => {
    const { error } = await supabase().auth.signInWithOtp({
      email: email.trim(),
      options: { shouldCreateUser: true, emailRedirectTo: window.location.origin + '/account' },
    })
    if (error) throw new Error(error.message)
  }

  const verifyOtp = async (email: string, code: string) => {
    const { data, error } = await supabase().auth.verifyOtp({
      email: email.trim(),
      token: code.trim(),
      type: 'email',
    })
    if (error) throw new Error(error.message)
    setUser({ id: data.user.id, email: data.user.email || '', name: data.user.user_metadata?.full_name as string })
  }

  const signOut = async () => {
    await supabase().auth.signOut()
    setUser(null)
  }

  return <Ctx.Provider value={{ user, loading, signOut, sendOtp, verifyOtp }}>{children}</Ctx.Provider>
}

export const useAuth = () => {
  const c = useContext(Ctx)
  if (!c) throw new Error('useAuth outside provider')
  return c
}
