import { wrapInBaseLayout, button, heading, paragraph, divider, smallText } from './base'

const WEBSITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://w-timer.com'

type BillingEvent = 'subscription_created' | 'subscription_renewed' | 'subscription_cancelled' | 'trial_started'

const TITLES: Record<BillingEvent, string> = {
  subscription_created: 'Subscription Activated',
  subscription_renewed: 'Subscription Renewed',
  subscription_cancelled: 'Subscription Cancelled',
  trial_started: 'Trial Started',
}

const MESSAGES: Record<BillingEvent, string> = {
  subscription_created: 'Your premium subscription is now active. Enjoy unlimited projects, cloud sync, and advanced analytics.',
  subscription_renewed: 'Your premium subscription has been successfully renewed. Thank you for your continued support!',
  subscription_cancelled: 'Your subscription has been cancelled. You\'ll continue to have access until the end of your current billing period.',
  trial_started: 'Your premium trial has started. Explore all the features Work Timer has to offer!',
}

export function buildBillingNotificationEmail(params: {
  event: BillingEvent
  planName: string
  displayName: string | null
  periodEnd?: string | null
}): { subject: string; html: string } {
  const greeting = params.displayName ? `Hi ${params.displayName},` : 'Hi,'
  const title = TITLES[params.event]
  const message = MESSAGES[params.event]

  const content = `
    ${heading(title)}
    ${paragraph(greeting)}
    ${paragraph(message)}

    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin: 24px 0;">
      <tr>
        <td style="padding: 16px; background-color: #f5f5f4; border-radius: 8px;">
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
            <tr>
              <td style="padding: 4px 0;">
                <span style="font-size: 13px; color: #78716c;">Plan</span>
                <br><span style="font-size: 15px; color: #1c1917; font-weight: 600;">${params.planName}</span>
              </td>
            </tr>
            ${params.periodEnd ? `<tr>
              <td style="padding: 4px 0;">
                <span style="font-size: 13px; color: #78716c;">${params.event === 'subscription_cancelled' ? 'Access until' : 'Next billing'}</span>
                <br><span style="font-size: 15px; color: #1c1917; font-weight: 600;">${params.periodEnd}</span>
              </td>
            </tr>` : ''}
          </table>
        </td>
      </tr>
    </table>

    ${button('Manage Billing', `${WEBSITE_URL}/billing`)}
    ${divider()}
    ${smallText('If you have questions about your billing, contact us at support@w-timer.com.')}
  `

  return {
    subject: `Work Timer: ${title}`,
    html: wrapInBaseLayout(content, `${title} - ${params.planName}`),
  }
}
