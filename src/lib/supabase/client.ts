import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()

  if (!supabaseUrl || !supabaseAnonKey || !supabaseUrl.startsWith('http')) {
    console.warn('Supabase environment variables debug info:', {
      hasUrl: !!supabaseUrl,
      urlLength: supabaseUrl?.length || 0,
      urlStart: supabaseUrl?.substring(0, 10), // 安全な範囲で最初だけ表示
      hasAnonKey: !!supabaseAnonKey,
      anonKeyLength: supabaseAnonKey?.length || 0,
      urlFormatOk: supabaseUrl?.startsWith('http') || false
    })
    // Return a dummy client with VALID FORMAT values to prevent library from throwing
    return createBrowserClient('https://placeholder.supabase.co', 'placeholder-key')
  }

  return createBrowserClient(supabaseUrl, supabaseAnonKey)
}
