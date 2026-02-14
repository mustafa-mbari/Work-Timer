import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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

  // If ext=true, redirect to extension bridge page (client component)
  if (ext === 'true') {
    return NextResponse.redirect(new URL('/auth/callback/extension', request.url))
  }

  // Otherwise go to dashboard
  return NextResponse.redirect(new URL('/dashboard', request.url))
}
