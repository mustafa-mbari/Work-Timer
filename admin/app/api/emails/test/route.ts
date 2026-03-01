import { NextRequest, NextResponse } from 'next/server'
import { requireAdminApi } from '@/lib/services/auth'
import { sendTestEmailSchema, parseBody } from '@/lib/validation'
import { sendEmail } from '@/lib/email'
import { buildWelcomeEmail } from '@/lib/email/templates/welcome'
import { buildGroupInvitationEmail } from '@/lib/email/templates/groupInvitation'
import { buildPasswordResetConfirmationEmail } from '@/lib/email/templates/passwordResetConfirmation'
import { buildBillingNotificationEmail } from '@/lib/email/templates/billingNotification'
import { buildInvoiceReceiptEmail } from '@/lib/email/templates/invoiceReceipt'
import { buildTrialEndingEmail } from '@/lib/email/templates/trialEnding'

function renderTemplate(template: string): { subject: string; html: string } {
  switch (template) {
    case 'welcome':
      return buildWelcomeEmail({ displayName: 'Test User' })
    case 'group_invitation':
      return buildGroupInvitationEmail({ inviterName: 'Admin', groupName: 'Test Team' })
    case 'password_reset_confirmation':
      return buildPasswordResetConfirmationEmail({ displayName: 'Test User' })
    case 'billing_notification':
      return buildBillingNotificationEmail({
        event: 'subscription_created',
        planName: 'Premium Monthly',
        displayName: 'Test User',
        periodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
      })
    case 'invoice_receipt':
      return buildInvoiceReceiptEmail({
        displayName: 'Test User',
        amount: '9.99',
        currency: 'usd',
        planName: 'Premium Monthly',
        invoiceDate: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
        invoiceNumber: 'INV-TEST-001',
        invoiceUrl: null,
      })
    case 'trial_ending':
      return buildTrialEndingEmail({
        displayName: 'Test User',
        daysRemaining: 3,
        trialEndDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
      })
    default:
      return { subject: 'Test Email', html: '<p>This is a test email from Work Timer.</p>' }
  }
}

export async function POST(request: NextRequest) {
  const admin = await requireAdminApi()
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const parsed = parseBody(sendTestEmailSchema, await request.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 })

  const { to, template } = parsed.data
  const { subject, html } = renderTemplate(template)

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
