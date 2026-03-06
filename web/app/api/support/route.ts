import { NextRequest, NextResponse } from 'next/server'
import { requireAuthApi } from '@/lib/services/auth'
import { getUserTickets, createSupportTicket } from '@/lib/repositories/supportTickets'
import { createSupportTicketSchema, parseBody } from '@/lib/validation'
import { sendEmail } from '@/lib/email/send'
import { buildSupportTicketEmail } from '@/lib/email/templates/supportTicket'
import { getProfile } from '@/lib/repositories/profiles'
import { withApiQuota } from '@/lib/apiQuota'

export async function GET() {
  const user = await requireAuthApi()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const tickets = await getUserTickets(user.id)
  return NextResponse.json(tickets)
}

export async function POST(request: NextRequest) {
  const user = await requireAuthApi()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const quotaBlocked = await withApiQuota(user.id, 'support')
  if (quotaBlocked) return quotaBlocked

  const body = await request.json()
  const parsed = parseBody(createSupportTicketSchema, body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 })

  const profile = await getProfile(user.id)
  const userName = profile?.display_name || null
  const userEmail = user.email || ''

  const { data: ticket, error } = await createSupportTicket(user.id, {
    user_email: userEmail,
    user_name: userName,
    issue_type: parsed.data.issue_type,
    subject: parsed.data.subject,
    description: parsed.data.description,
    priority: parsed.data.priority,
    platform: parsed.data.platform,
    issue_time: parsed.data.issue_time ?? null,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Send notification email (fire-and-forget)
  const emailData = buildSupportTicketEmail({
    userName,
    userEmail,
    issueType: parsed.data.issue_type,
    subject: parsed.data.subject,
    description: parsed.data.description,
    priority: parsed.data.priority,
    platform: parsed.data.platform,
    issueTime: parsed.data.issue_time ?? null,
  })

  sendEmail({
    to: process.env.SMTP_SUPPORT_EMAIL || 'support@w-timer.com',
    subject: emailData.subject,
    html: emailData.html,
    type: 'support_ticket',
    metadata: { ticket_id: ticket?.id, user_id: user.id },
    sentBy: user.id,
  }).catch(err => console.error('[support] Failed to send notification email:', err))

  return NextResponse.json({ success: true, id: ticket?.id }, { status: 201 })
}
