import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const getVal = (v: string | undefined) => {
  if (!v) return undefined
  const trimmed = v.trim()
  if (trimmed.includes('=') && (trimmed.startsWith('NEXT_PUBLIC_') || trimmed.startsWith('SUPABASE_') || trimmed.startsWith('ENCRYPTION_'))) {
    return trimmed.split('=')[1].trim()
  }
  return trimmed
}

export async function createClient() {
  const cookieStore = await cookies()

  const supabaseUrl = getVal(process.env.NEXT_PUBLIC_SUPABASE_URL)
  const supabaseAnonKey = getVal(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

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
  const supabaseUrl = getVal(process.env.NEXT_PUBLIC_SUPABASE_URL)
  const serviceRoleKey = getVal(process.env.SUPABASE_SERVICE_ROLE_KEY)

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
