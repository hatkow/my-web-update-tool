import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()

  // Build-time safety: return a placeholder if env vars are missing
  if (!supabaseUrl || !supabaseAnonKey || !supabaseUrl.startsWith('http')) {
    return createServerClient(
      'https://placeholder.supabase.co',
      'placeholder-key',
      {
        cookies: {
          getAll() { return [] },
          setAll() {},
        },
      }
    )
  }

  return createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing sessions.
          }
        },
      },
    }
  )
}

// Admin client with service role for admin operations
export async function createAdminClient() {
  const cookieStore = await cookies()
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()

  if (!supabaseUrl || !serviceRoleKey || !supabaseUrl.startsWith('http')) {
    return createServerClient(
      'https://placeholder.supabase.co',
      'placeholder-key',
      {
        cookies: {
          getAll() { return [] },
          setAll() {},
        },
      }
    )
  }

  return createServerClient(
    supabaseUrl,
    serviceRoleKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Ignored in Server Components
          }
        },
      },
    }
  )
}
