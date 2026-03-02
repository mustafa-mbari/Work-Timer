import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { sendEmail, buildPasswordResetEmail } from '@/lib/email'

export async function POST(request: NextRequest) {
  const { email } = await request.json()
  const origin = request.nextUrl.origin

  if (!email || typeof email !== 'string') {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 })
  }

  // Always return success to avoid revealing whether the email exists
  try {
    const serviceSupabase = await createServiceClient()

    const { data: linkData, error: linkError } =
      await serviceSupabase.auth.admin.generateLink({
        type: 'recovery',
        email,
        options: {
          redirectTo: `${origin}/auth/callback?next=/reset-password`,
        },
      })

    if (linkError || !linkData) {
      // Don't reveal if user doesn't exist — log and return success
      console.error('[forgot-password] generateLink failed:', linkError?.message)
      return NextResponse.json({ success: true })
    }

    const hashedToken = linkData.properties?.hashed_token
    if (!hashedToken) {
      console.error('[forgot-password] No hashed_token in generateLink response')
      return NextResponse.json({ success: true })
    }

    const resetUrl =
      `${origin}/auth/confirm?token_hash=${encodeURIComponent(hashedToken)}&type=recovery&next=${encodeURIComponent('/reset-password')}`

    let displayName: string | null = null
    if (linkData.user) {
      displayName =
        linkData.user.user_metadata?.full_name ??
        linkData.user.user_metadata?.name ??
        null
    }

    const { subject, html } = buildPasswordResetEmail({
      resetUrl,
      displayName,
    })

    const result = await sendEmail({
      to: email,
      subject,
      html,
      type: 'password_reset_confirmation',
      metadata: { trigger: 'forgot-password' },
    })

    if (!result.success) {
      console.error('[forgot-password] sendEmail failed:', result.error)
    }
  } catch (err) {
    console.error('[forgot-password] Unexpected error:', err)
  }

  return NextResponse.json({ success: true })
}
