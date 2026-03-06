import { getTransporter, getFromAddress } from './transporter'
import { createServiceClient } from '@/lib/supabase/server'

export type EmailType =
  | 'welcome'
  | 'email_verification'
  | 'group_invitation'
  | 'password_reset_confirmation'
  | 'billing_notification'
  | 'invoice_receipt'
  | 'trial_ending'
  | 'support_ticket'
  | 'feature_suggestion'
  | 'test'

interface SendEmailParams {
  to: string
  subject: string
  html: string
  type: EmailType
  metadata?: Record<string, unknown>
  sentBy?: string | null
}

export async function sendEmail({ to, subject, html, type, metadata, sentBy }: SendEmailParams): Promise<{
  success: boolean
  messageId?: string
  error?: string
}> {
  const transporter = getTransporter()

  try {
    const info = await transporter.sendMail({
      from: getFromAddress(),
      to,
      subject,
      html,
    })

    // Log success
    await logEmailToDb({
      recipient: to,
      type,
      subject,
      status: 'sent',
      message_id: info.messageId || null,
      metadata: metadata || {},
      sent_by: sentBy || null,
    })

    return { success: true, messageId: info.messageId }
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error'

    // Log failure
    await logEmailToDb({
      recipient: to,
      type,
      subject,
      status: 'failed',
      error: errorMsg,
      metadata: metadata || {},
      sent_by: sentBy || null,
    })

    console.error(`[email] Failed to send ${type} email to ${to}:`, errorMsg)
    return { success: false, error: errorMsg }
  }
}

async function logEmailToDb(params: {
  recipient: string
  type: string
  subject: string
  status: string
  message_id?: string | null
  error?: string | null
  metadata: Record<string, unknown>
  sent_by: string | null
}) {
  try {
    const supabase = await createServiceClient()
    await supabase.from('email_logs').insert({
      recipient: params.recipient,
      type: params.type,
      subject: params.subject,
      status: params.status,
      message_id: params.message_id || null,
      error: params.error || null,
      metadata: params.metadata,
      sent_by: params.sent_by,
    })
  } catch (err) {
    console.error('[email] Failed to log email:', err)
  }
}
