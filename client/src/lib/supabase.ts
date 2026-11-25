// Browser Supabase client — customer auth (email OTP), reads, and image storage.
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string

export const hasSupabase = !!(url && key && url.startsWith('http'))

export const AUTH_STORAGE_KEY = 'aruna-auth'

let client: SupabaseClient | null = null
export function supabase(): SupabaseClient {
  if (!client && hasSupabase) client = createClient(url, key, {
    auth: {
      persistSession: true, autoRefreshToken: true, detectSessionInUrl: true,
      // Implicit flow (NOT pkce): confirmation / magic / reset emails carry a self-contained
      // ?token_hash=… link that Supabase verifies server-side, so it signs the user in in ANY
      // browser or profile — not just the one that created the account. (PKCE links only work in
      // the originating profile, because the code_verifier lives in that profile's storage.)
      flowType: 'implicit',
      storageKey: AUTH_STORAGE_KEY,
    },
  })
  return client as SupabaseClient
}

// Was someone signed in on this device before? Lets us skip loading the auth
// machinery for first-time visitors (keeps shop browsing light).
export function hadSession(): boolean {
  try {
    return !!localStorage.getItem(AUTH_STORAGE_KEY) || /[?&#](code|access_token)=/.test(window.location.href)
  } catch {
    return false
  }
}

// Signed, long-lived URLs for images stored in the Supabase storage bucket
export async function storageUrl(publicPath: string): Promise<string> {
  if (!publicPath) return ''
  if (publicPath.startsWith('http')) return publicPath
  // Public bucket: just prefix with the storage CDN. Private bucket: createSignedUrl.
  const sb = supabase()
  const { data } = sb.storage.from('aruna-images').getPublicUrl(publicPath)
  return data.publicUrl
}
