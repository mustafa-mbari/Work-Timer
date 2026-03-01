import { buildWelcomeEmail } from './templates/welcome'
import { buildGroupInvitationEmail } from './templates/groupInvitation'
import { buildPasswordResetConfirmationEmail } from './templates/passwordResetConfirmation'
import { buildBillingNotificationEmail } from './templates/billingNotification'
import { buildInvoiceReceiptEmail } from './templates/invoiceReceipt'
import { buildTrialEndingEmail } from './templates/trialEnding'

export function renderTestTemplate(template: string): { subject: string; html: string } {
  switch (template) {
    case 'welcome':
      return buildWelcomeEmail({ displayName: 'Jane Doe' })
    case 'group_invitation':
      return buildGroupInvitationEmail({ inviterName: 'John Smith', groupName: 'Design Team' })
    case 'password_reset_confirmation':
      return buildPasswordResetConfirmationEmail({ displayName: 'Jane Doe' })
    case 'billing_notification':
      return buildBillingNotificationEmail({
        event: 'subscription_created',
        planName: 'Premium Monthly',
        displayName: 'Jane Doe',
        periodEnd: 'April 1, 2026',
      })
    case 'invoice_receipt':
      return buildInvoiceReceiptEmail({
        displayName: 'Jane Doe',
        amount: '9.99',
        currency: 'usd',
        planName: 'Premium Monthly',
        invoiceDate: 'March 1, 2026',
        invoiceNumber: 'INV-2026-001',
        invoiceUrl: '#',
      })
    case 'trial_ending':
      return buildTrialEndingEmail({
        displayName: 'Jane Doe',
        daysRemaining: 3,
        trialEndDate: 'March 4, 2026',
      })
    default:
      return { subject: 'Test Email', html: '<p>This is a test email from Work Timer.</p>' }
  }
}
