import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { sendEmail, buildWelcomeEmail } from '@/lib/email'

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type') as 'signup' | 'magiclink' | 'email'
  const next = searchParams.get('next') ?? '/entries'

  if (!tokenHash || !type) {
    return NextResponse.redirect(new URL('/login?error=invalid_link', request.url))
  }

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

  const { error } = await supabase.auth.verifyOtp({
    type,
    token_hash: tokenHash,
  })

  if (error) {
    console.error('[auth/confirm] verifyOtp failed:', error.message)
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(error.message)}`, request.url)
    )
  }

  // Ensure profile exists + send welcome email (mirrors /auth/callback logic)
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    const serviceSupabase = await createServiceClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (serviceSupabase.from('profiles') as any).upsert({
      id: user.id,
      email: user.email,
      display_name: user.user_metadata?.full_name || user.user_metadata?.name || null,
      role: 'user',
      created_at: user.created_at,
    }, { onConflict: 'id', ignoreDuplicates: true })

    // Send welcome email for first-time users
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { count } = await (serviceSupabase.from('email_logs') as any)
      .select('id', { count: 'exact', head: true })
      .eq('recipient', user.email)
      .eq('type', 'welcome')
    if (count === 0 && user.email) {
      const displayName = user.user_metadata?.full_name || user.user_metadata?.name || null
      const { subject, html } = buildWelcomeEmail({ displayName })
      sendEmail({ to: user.email, subject, html, type: 'welcome' }).catch(() => {})
    }
  }

  const response = NextResponse.redirect(new URL(next, request.url))
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  cookiesToSet.forEach(({ name, value, options }: any) =>
    response.cookies.set(name, value, options)
  )
  return response
}
