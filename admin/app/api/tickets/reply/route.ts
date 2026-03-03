import { NextRequest, NextResponse } from 'next/server'
import { requireAdminApi } from '@/lib/services/auth'
import { getTicketById } from '@/lib/repositories/supportTickets'
import { replyToTicketSchema, parseBody } from '@/lib/validation'
import { sendEmail } from '@/lib/email/send'
import { buildTicketReplyEmail } from '@/lib/email/templates/ticketReply'

export async function POST(request: NextRequest) {
  const admin = await requireAdminApi()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const parsed = parseBody(replyToTicketSchema, await request.json())
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error }, { status: 400 })
  }

  const { id, message } = parsed.data

  const ticket = await getTicketById(id)
  if (!ticket) {
    return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
  }

  const emailData = buildTicketReplyEmail({
    userName: ticket.user_name,
    ticketSubject: ticket.subject,
    message,
    status: ticket.status,
  })

  const result = await sendEmail({
    to: ticket.user_email,
    subject: emailData.subject,
    html: emailData.html,
    type: 'ticket_reply',
    metadata: { ticket_id: id, message },
    sentBy: admin.user.id,
  })

  if (!result.success) {
    return NextResponse.json({ error: result.error || 'Failed to send email' }, { status: 500 })
  }

  return NextResponse.json({ success: true, messageId: result.messageId })
}
