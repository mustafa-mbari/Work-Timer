import { wrapInBaseLayout, button, heading, paragraph, divider, smallText } from './base'

const WEBSITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://w-timer.com'

export function buildTrialEndingEmail(params: {
  displayName: string | null
  daysRemaining: number
  trialEndDate: string
}): { subject: string; html: string } {
  const greeting = params.displayName ? `Hi ${params.displayName},` : 'Hi,'
  const daysText = params.daysRemaining === 1 ? 'tomorrow' : `in ${params.daysRemaining} days`

  const content = `
    ${heading(`Your trial ends ${daysText}`)}
    ${paragraph(greeting)}
    ${paragraph(`Your Work Timer premium trial ends on <strong>${params.trialEndDate}</strong>. Subscribe now to keep access to all premium features.`)}

    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin: 24px 0;">
      <tr>
        <td style="padding: 16px; background-color: #eef2ff; border-radius: 8px; border: 1px solid #c7d2fe;">
          <p style="margin: 0 0 8px; font-size: 14px; font-weight: 600; color: #1c1917;">What you'll keep with Premium:</p>
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
            <tr><td style="padding: 4px 0; font-size: 14px; color: #44403c;">&#10003; Unlimited projects & tags</td></tr>
            <tr><td style="padding: 4px 0; font-size: 14px; color: #44403c;">&#10003; Cloud sync across devices</td></tr>
            <tr><td style="padding: 4px 0; font-size: 14px; color: #44403c;">&#10003; Advanced analytics & reports</td></tr>
            <tr><td style="padding: 4px 0; font-size: 14px; color: #44403c;">&#10003; PDF & Excel export</td></tr>
            <tr><td style="padding: 4px 0; font-size: 14px; color: #44403c;">&#10003; Team collaboration</td></tr>
          </table>
        </td>
      </tr>
    </table>

    ${button('Subscribe Now', `${WEBSITE_URL}/billing`)}
    ${divider()}
    ${smallText('After your trial ends, you\'ll be moved to the free plan. Your data will be preserved and you can upgrade at any time.')}
  `

  return {
    subject: `Your Work Timer trial ends ${daysText}`,
    html: wrapInBaseLayout(content, `Your premium trial ends ${daysText}. Subscribe to keep all features.`),
  }
}
