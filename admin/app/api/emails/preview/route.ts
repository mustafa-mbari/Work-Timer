import { NextRequest, NextResponse } from 'next/server'
import { requireAdminApi } from '@/lib/services/auth'
import { buildWelcomeEmail } from '@/lib/email/templates/welcome'
import { buildGroupInvitationEmail } from '@/lib/email/templates/groupInvitation'
import { buildPasswordResetConfirmationEmail } from '@/lib/email/templates/passwordResetConfirmation'
import { buildBillingNotificationEmail } from '@/lib/email/templates/billingNotification'
import { buildInvoiceReceiptEmail } from '@/lib/email/templates/invoiceReceipt'
import { buildTrialEndingEmail } from '@/lib/email/templates/trialEnding'

function renderTemplate(template: string): string {
  switch (template) {
    case 'welcome':
      return buildWelcomeEmail({ displayName: 'Jane Doe' }).html
    case 'group_invitation':
      return buildGroupInvitationEmail({ inviterName: 'John Smith', groupName: 'Design Team' }).html
    case 'password_reset_confirmation':
      return buildPasswordResetConfirmationEmail({ displayName: 'Jane Doe' }).html
    case 'billing_notification':
      return buildBillingNotificationEmail({
        event: 'subscription_created',
        planName: 'Premium Monthly',
        displayName: 'Jane Doe',
        periodEnd: 'April 1, 2026',
      }).html
    case 'invoice_receipt':
      return buildInvoiceReceiptEmail({
        displayName: 'Jane Doe',
        amount: '9.99',
        currency: 'usd',
        planName: 'Premium Monthly',
        invoiceDate: 'March 1, 2026',
        invoiceNumber: 'INV-2026-001',
        invoiceUrl: '#',
      }).html
    case 'trial_ending':
      return buildTrialEndingEmail({
        displayName: 'Jane Doe',
        daysRemaining: 3,
        trialEndDate: 'March 4, 2026',
      }).html
    default:
      return '<p>Unknown template</p>'
  }
}

export async function GET(request: NextRequest) {
  const admin = await requireAdminApi()
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const template = request.nextUrl.searchParams.get('template') || 'welcome'
  const html = renderTemplate(template)

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}
