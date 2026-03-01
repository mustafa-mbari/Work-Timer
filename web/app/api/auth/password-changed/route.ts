import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendEmail, buildPasswordResetConfirmationEmail } from '@/lib/email'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user?.email) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const displayName = user.user_metadata?.full_name || user.user_metadata?.name || null
  const { subject, html } = buildPasswordResetConfirmationEmail({ displayName })

  const result = await sendEmail({
    to: user.email,
    subject,
    html,
    type: 'password_reset_confirmation',
  })

  return NextResponse.json({ success: result.success })
}
