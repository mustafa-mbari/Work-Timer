import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { sendEmail, buildEmailVerificationEmail } from '@/lib/email'

export async function POST(request: NextRequest) {
  const { email, password, ext, displayName } = await request.json()
  const origin = request.nextUrl.origin

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

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/auth/callback${ext ? '?ext=true' : ''}`,
      data: displayName ? { full_name: displayName } : undefined,
    },
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  // Supabase returns a user with empty identities when the email is already
  // registered and confirmed — detect this and tell the user to sign in.
  if (data.user && data.user.identities?.length === 0) {
    return NextResponse.json(
      { error: 'An account with this email already exists. Please sign in instead.' },
      { status: 409 }
    )
  }

  // Send verification email via our own SMTP (bypasses GoTrue's email which
  // fails silently for signup verification). Fire-and-forget so we don't
  // block the signup response.
  sendVerificationEmail(email, displayName || null, origin, ext).catch(
    (err) => console.error('[sign-up] Failed to send verification email:', err)
  )

  const response = NextResponse.json({ success: true })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  cookiesToSet.forEach(({ name, value, options }: any) => response.cookies.set(name, value, options))
  return response
}

async function sendVerificationEmail(
  email: string,
  displayName: string | null,
  origin: string,
  ext?: boolean
): Promise<void> {
  const serviceSupabase = await createServiceClient()

  // Use magiclink type — works for both new and existing unconfirmed users.
  // type: 'signup' requires a password and fails for existing users.
  const { data: linkData, error: linkError } =
    await serviceSupabase.auth.admin.generateLink({
      type: 'magiclink',
      email,
      options: {
        redirectTo: `${origin}/auth/callback${ext ? '?ext=true' : ''}`,
      },
    })

  if (linkError || !linkData) {
    throw new Error(
      `generateLink failed: ${linkError?.message ?? 'no data returned'}`
    )
  }

  const hashedToken = linkData.properties?.hashed_token
  if (!hashedToken) {
    throw new Error('generateLink did not return hashed_token')
  }

  // Build our own verification URL pointing to /auth/confirm which calls verifyOtp()
  const next = ext ? '/auth/callback/extension' : '/entries'
  const verificationUrl =
    `${origin}/auth/confirm?token_hash=${encodeURIComponent(hashedToken)}&type=magiclink&next=${encodeURIComponent(next)}`

  const { subject, html } = buildEmailVerificationEmail({
    verificationUrl,
    displayName,
  })

  const result = await sendEmail({
    to: email,
    subject,
    html,
    type: 'email_verification',
    metadata: { trigger: 'signup' },
  })

  if (!result.success) {
    throw new Error(`sendEmail failed: ${result.error}`)
  }
}
