import { wrapInBaseLayout, button, heading, paragraph, divider, smallText } from './base'

const WEBSITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://w-timer.com'

export function buildGroupInvitationEmail(params: {
  inviterName: string
  groupName: string
}): { subject: string; html: string } {
  const content = `
    ${heading('You\'ve been invited to a team')}
    ${paragraph(`<strong>${params.inviterName}</strong> has invited you to join <strong>${params.groupName}</strong> on Work Timer.`)}
    ${paragraph('As a team member, you can share timesheets, collaborate on projects, and track time together.')}

    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin: 24px 0;">
      <tr>
        <td style="padding: 16px; background-color: #eef2ff; border-radius: 8px; border: 1px solid #c7d2fe;">
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
            <tr>
              <td>
                <span style="font-size: 13px; color: #6366f1; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Team</span>
                <br><span style="font-size: 17px; color: #1c1917; font-weight: 600;">${params.groupName}</span>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    ${button('View Invitation', `${WEBSITE_URL}/groups`)}
    ${divider()}
    ${smallText('This invitation expires in 7 days. If you don\'t have a Work Timer account yet, you\'ll need to create one first.')}
  `

  return {
    subject: `${params.inviterName} invited you to join ${params.groupName}`,
    html: wrapInBaseLayout(content, `${params.inviterName} invited you to join ${params.groupName} on Work Timer`),
  }
}
