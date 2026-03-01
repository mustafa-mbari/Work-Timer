import { wrapInBaseLayout, button, heading, paragraph, divider, smallText } from './base'

const WEBSITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://w-timer.com'

export function buildPasswordResetConfirmationEmail(params: {
  displayName: string | null
}): { subject: string; html: string } {
  const greeting = params.displayName ? `Hi ${params.displayName},` : 'Hi,'

  const content = `
    ${heading('Password Updated')}
    ${paragraph(greeting)}
    ${paragraph('Your password has been successfully changed. You can now sign in with your new password.')}

    ${button('Sign In', `${WEBSITE_URL}/login`)}

    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin: 24px 0;">
      <tr>
        <td style="padding: 16px; background-color: #fef2f2; border-radius: 8px; border: 1px solid #fecaca;">
          <p style="margin: 0; font-size: 13px; color: #991b1b;">
            <strong>Didn't make this change?</strong> If you didn't reset your password, please contact us immediately at
            <a href="mailto:support@w-timer.com" style="color: #6366f1; text-decoration: none;">support@w-timer.com</a>.
          </p>
        </td>
      </tr>
    </table>

    ${divider()}
    ${smallText('This is an automated security notification from Work Timer.')}
  `

  return {
    subject: 'Your password has been updated',
    html: wrapInBaseLayout(content, 'Your Work Timer password has been successfully changed.'),
  }
}
