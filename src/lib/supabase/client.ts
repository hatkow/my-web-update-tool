import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  const getVal = (v: string | undefined) => {
    if (!v) return undefined
    const trimmed = v.trim()
    if (trimmed.includes('=') && (trimmed.startsWith('NEXT_PUBLIC_') || trimmed.startsWith('SUPABASE_') || trimmed.startsWith('ENCRYPTION_'))) {
      return trimmed.split('=')[1].trim()
    }
    return trimmed
  }

  const supabaseUrl = getVal(process.env.NEXT_PUBLIC_SUPABASE_URL)
  const supabaseAnonKey = getVal(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

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
