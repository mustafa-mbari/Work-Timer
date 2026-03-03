import { NextRequest, NextResponse } from 'next/server'
import { requireAuthApi } from '@/lib/services/auth'
import { getUserSuggestions, createFeatureSuggestion } from '@/lib/repositories/featureSuggestions'
import { createFeatureSuggestionSchema, parseBody } from '@/lib/validation'
import { sendEmail } from '@/lib/email/send'
import { buildFeatureSuggestionEmail } from '@/lib/email/templates/featureSuggestion'
import { getProfile } from '@/lib/repositories/profiles'

export async function GET() {
  const user = await requireAuthApi()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const suggestions = await getUserSuggestions(user.id)
  return NextResponse.json(suggestions)
}

export async function POST(request: NextRequest) {
  const user = await requireAuthApi()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const parsed = parseBody(createFeatureSuggestionSchema, body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 })

  const profile = await getProfile(user.id)
  const userName = profile?.display_name || null
  const userEmail = user.email || ''

  const { data: suggestion, error } = await createFeatureSuggestion(user.id, {
    user_email: userEmail,
    user_name: userName,
    suggestion_type: parsed.data.suggestion_type,
    title: parsed.data.title,
    description: parsed.data.description,
    importance: parsed.data.importance,
    target_platform: parsed.data.target_platform,
    notify_on_release: parsed.data.notify_on_release,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Send notification email (fire-and-forget)
  const emailData = buildFeatureSuggestionEmail({
    userName,
    userEmail,
    suggestionType: parsed.data.suggestion_type,
    title: parsed.data.title,
    description: parsed.data.description,
    importance: parsed.data.importance,
    targetPlatform: parsed.data.target_platform,
    notifyOnRelease: parsed.data.notify_on_release,
  })

  sendEmail({
    to: process.env.SMTP_FROM_EMAIL || 'info@w-timer.com',
    subject: emailData.subject,
    html: emailData.html,
    type: 'feature_suggestion',
    metadata: { suggestion_id: suggestion?.id, user_id: user.id },
    sentBy: user.id,
  }).catch(err => console.error('[suggestions] Failed to send notification email:', err))

  return NextResponse.json({ success: true, id: suggestion?.id }, { status: 201 })
}
