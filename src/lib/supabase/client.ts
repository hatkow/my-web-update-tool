import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Missing Supabase environment variables')
    // Return a dummy client or proceed with empty strings to allow build to pass
    // (Runtime operations will fail, but build will succeed)
  }

  return createBrowserClient(supabaseUrl || '', supabaseAnonKey || '')
}
