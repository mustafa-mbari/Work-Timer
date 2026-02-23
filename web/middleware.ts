import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip auth entirely for public routes — avoids a Supabase round-trip
  const publicPaths = [
    '/',
    '/login',
    '/register',
    '/terms',
    '/privacy',
    '/api/webhooks',
    '/auth',
    '/forgot-password',
    '/reset-password',
    '/verify-email',
  ]
  if (publicPaths.some(p => pathname === p || pathname.startsWith(p + '/'))) {
    return NextResponse.next({ request })
  }

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setAll(cookiesToSet: any) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          cookiesToSet.forEach(({ name, value }: any) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          cookiesToSet.forEach(({ name, value, options }: any) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh session — required for @supabase/ssr
  let user = null
  try {
    const { data } = await supabase.auth.getUser()
    user = data.user
  } catch {
    // Network error (e.g., Supabase blocked by corporate proxy) — treat as unauthenticated
  }

  // Protect authenticated routes
  const protectedPaths = ['/dashboard', '/billing', '/analytics']
  const adminPaths = ['/admin']

  const isProtected = protectedPaths.some(p => pathname.startsWith(p))
  const isAdmin = adminPaths.some(p => pathname.startsWith(p))

  if ((isProtected || isAdmin) && !user) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    loginUrl.searchParams.set('redirectTo', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    // Exclude static assets, images, and /supabase-proxy (handled by Next.js rewrite,
    // no auth needed — Supabase authenticates its own API calls).
    '/((?!_next/static|_next/image|favicon.ico|supabase-proxy|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
