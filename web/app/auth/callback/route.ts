import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { sendEmail, buildWelcomeEmail } from '@/lib/email'

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const code = searchParams.get('code')
  const ext = searchParams.get('ext')

  if (!code) {
    return NextResponse.redirect(new URL('/login?error=no_code', request.url))
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    return NextResponse.redirect(new URL(`/login?error=${error.message}`, request.url))
  }

  // Ensure a profile row exists for this user
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

    // Send welcome email for first-time users (profile was just created via ignoreDuplicates)
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

  // If ext=true, redirect to extension bridge page (client component)
  if (ext === 'true') {
    return NextResponse.redirect(new URL('/auth/callback/extension', request.url))
  }

  // Support ?next= for post-auth redirects (e.g. password reset)
  const next = searchParams.get('next')
  if (next && next.startsWith('/')) {
    return NextResponse.redirect(new URL(next, request.url))
  }

  // Otherwise go to entries
  return NextResponse.redirect(new URL('/entries', request.url))
}
