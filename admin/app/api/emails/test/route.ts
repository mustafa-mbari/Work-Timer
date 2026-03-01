import { NextRequest, NextResponse } from 'next/server'
import { requireAdminApi } from '@/lib/services/auth'
import { sendTestEmailSchema, parseBody } from '@/lib/validation'
import { sendEmail } from '@/lib/email'
import { renderTestTemplate } from '@/lib/email/renderTestTemplate'

export async function POST(request: NextRequest) {
  const admin = await requireAdminApi()
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const parsed = parseBody(sendTestEmailSchema, await request.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 })

  const { to, template } = parsed.data
  const { subject, html } = renderTestTemplate(template)

  const result = await sendEmail({
    to,
    subject: `[TEST] ${subject}`,
    html,
    type: 'test',
    metadata: { template },
    sentBy: admin.user.id,
  })

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 500 })
  }

  return NextResponse.json({ success: true, messageId: result.messageId })
}
