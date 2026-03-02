import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { sendEmail, buildEmailVerificationEmail } from '@/lib/email'

export async function POST(request: NextRequest) {
  const { email } = await request.json()

  if (!email || typeof email !== 'string') {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 })
  }

  try {
    const serviceSupabase = await createServiceClient()

    const { data: linkData, error: linkError } =
      await serviceSupabase.auth.admin.generateLink({
        type: 'magiclink',
        email,
        options: {
          redirectTo: `${request.nextUrl.origin}/auth/callback`,
        },
      })

    if (linkError || !linkData) {
      console.error('[resend-verification] generateLink failed:', linkError?.message)
      return NextResponse.json(
        { error: linkError?.message ?? 'Failed to generate verification link' },
        { status: 400 }
      )
    }

    const hashedToken = linkData.properties?.hashed_token
    if (!hashedToken) {
      console.error('[resend-verification] No hashed_token in generateLink response')
      return NextResponse.json(
        { error: 'Failed to generate verification link' },
        { status: 500 }
      )
    }

    const verificationUrl =
      `${request.nextUrl.origin}/auth/confirm?token_hash=${encodeURIComponent(hashedToken)}&type=magiclink&next=${encodeURIComponent('/entries')}`

    // Try to get the user's display name for a personalized email
    let displayName: string | null = null
    if (linkData.user) {
      displayName =
        linkData.user.user_metadata?.full_name ??
        linkData.user.user_metadata?.name ??
        null
    }

    const { subject, html } = buildEmailVerificationEmail({
      verificationUrl,
      displayName,
    })

    const result = await sendEmail({
      to: email,
      subject,
      html,
      type: 'email_verification',
      metadata: { trigger: 'resend' },
    })

    if (!result.success) {
      console.error('[resend-verification] sendEmail failed:', result.error)
      return NextResponse.json(
        { error: 'Failed to send verification email. Please try again.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[resend-verification] Unexpected error:', err)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
