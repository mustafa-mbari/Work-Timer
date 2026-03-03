import { NextRequest, NextResponse } from 'next/server'
import { requireAdminApi } from '@/lib/services/auth'
import { getSuggestionById } from '@/lib/repositories/featureSuggestions'
import { replyToSuggestionSchema, parseBody } from '@/lib/validation'
import { sendEmail } from '@/lib/email/send'
import { buildSuggestionReplyEmail } from '@/lib/email/templates/suggestionReply'

export async function POST(request: NextRequest) {
  const admin = await requireAdminApi()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const parsed = parseBody(replyToSuggestionSchema, await request.json())
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error }, { status: 400 })
  }

  const { id, message } = parsed.data

  const suggestion = await getSuggestionById(id)
  if (!suggestion) {
    return NextResponse.json({ error: 'Suggestion not found' }, { status: 404 })
  }

  const emailData = buildSuggestionReplyEmail({
    userName: suggestion.user_name,
    suggestionTitle: suggestion.title,
    message,
    status: suggestion.status,
  })

  const result = await sendEmail({
    to: suggestion.user_email,
    subject: emailData.subject,
    html: emailData.html,
    type: 'suggestion_reply',
    metadata: { suggestion_id: id, message },
    sentBy: admin.user.id,
  })

  if (!result.success) {
    return NextResponse.json({ error: result.error || 'Failed to send email' }, { status: 500 })
  }

  return NextResponse.json({ success: true, messageId: result.messageId })
}
