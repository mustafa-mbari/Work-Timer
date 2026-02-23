import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/lib/shared/types'

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!

  return createBrowserClient<Database>(
    supabaseUrl,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        // In the browser, rewrite Supabase API calls to go through /supabase-proxy on our
        // own domain so corporate firewalls that block *.supabase.co don't break auth.
        // window.location.origin is always correct for any deployment (preview, prod, custom domain).
        // On the server (SSR), skip the proxy — server-to-server calls reach Supabase directly.
        fetch: (input, init) => {
          if (typeof window === 'undefined') return fetch(input, init)
          const url = typeof input === 'string' ? input
            : input instanceof URL ? input.href
            : (input as Request).url
          if (url.startsWith(supabaseUrl)) {
            const proxied = url.replace(supabaseUrl, `${window.location.origin}/supabase-proxy`)
            return fetch(proxied, init)
          }
          return fetch(input, init)
        },
      },
    }
  )
}
