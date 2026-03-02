import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { sendEmail, buildMagicLinkEmail } from '@/lib/email'

export async function POST(request: NextRequest) {
  const { email, ext } = await request.json()
  const origin = request.nextUrl.origin

  if (!email || typeof email !== 'string') {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 })
  }

  // Always return success to avoid revealing whether the email exists
  try {
    const serviceSupabase = await createServiceClient()

    const { data: linkData, error: linkError } =
      await serviceSupabase.auth.admin.generateLink({
        type: 'magiclink',
        email,
        options: {
          redirectTo: `${origin}/auth/callback${ext ? '?ext=true' : ''}`,
        },
      })

    if (linkError || !linkData) {
      console.error('[magic-link] generateLink failed:', linkError?.message)
      return NextResponse.json({ success: true })
    }

    const hashedToken = linkData.properties?.hashed_token
    if (!hashedToken) {
      console.error('[magic-link] No hashed_token in generateLink response')
      return NextResponse.json({ success: true })
    }

    const next = ext ? '/auth/callback/extension' : '/entries'
    const magicLinkUrl =
      `${origin}/auth/confirm?token_hash=${encodeURIComponent(hashedToken)}&type=magiclink&next=${encodeURIComponent(next)}`

    let displayName: string | null = null
    if (linkData.user) {
      displayName =
        linkData.user.user_metadata?.full_name ??
        linkData.user.user_metadata?.name ??
        null
    }

    const { subject, html } = buildMagicLinkEmail({
      magicLinkUrl,
      displayName,
    })

    const result = await sendEmail({
      to: email,
      subject,
      html,
      type: 'email_verification',
      metadata: { trigger: 'magic-link' },
    })

    if (!result.success) {
      console.error('[magic-link] sendEmail failed:', result.error)
    }
  } catch (err) {
    console.error('[magic-link] Unexpected error:', err)
  }

  return NextResponse.json({ success: true })
}
