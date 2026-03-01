import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const { email, password, ext, displayName } = await request.json()
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

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: redirectTo,
      data: displayName ? { full_name: displayName } : undefined,
    },
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  const response = NextResponse.json({ success: true })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  cookiesToSet.forEach(({ name, value, options }: any) => response.cookies.set(name, value, options))
  return response
}
