import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/lib/shared/types'

export function createClient() {
  // Route all browser-side Supabase calls through /supabase-proxy on our own domain.
  // This ensures corporate firewalls that block *.supabase.co don't break auth or data ops.
  // The Next.js rewrite in next.config.js forwards these to the real Supabase URL server-side.
  const proxyUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://w-timer.com'}/supabase-proxy`
  return createBrowserClient<Database>(
    proxyUrl,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
