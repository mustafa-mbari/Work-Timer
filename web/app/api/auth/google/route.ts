import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const ext = request.nextUrl.searchParams.get('ext') === 'true'
  const redirectTo = `${request.nextUrl.origin}/auth/callback${ext ? '?ext=true' : ''}`

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cookiesToSet: any[] = []
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setAll: (cookies: any[]) => { cookiesToSet.push(...cookies) },
      },
    }
  )

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo },
  })

  if (error || !data.url) {
    return NextResponse.redirect(new URL('/login?error=oauth_failed', request.url))
  }

  // Redirect to Google — carry any PKCE verifier cookies Supabase set
  const response = NextResponse.redirect(data.url)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  cookiesToSet.forEach(({ name, value, options }: any) => response.cookies.set(name, value, options))
  return response
}
