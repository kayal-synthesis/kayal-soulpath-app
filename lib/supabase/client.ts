import { createClient as createSupabaseClient } from '@supabase/supabase-js'

let client: ReturnType<typeof createSupabaseClient> | null = null

export const createClient = () => {
  if (client) return client
  client = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: true,
        storageKey: 'kayal_auth',
        storage: typeof window !== 'undefined' ? window.localStorage : undefined,
        autoRefreshToken: false,
        detectSessionInUrl: true,
      }
    }
  )
  return client
}