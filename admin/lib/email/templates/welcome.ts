import { wrapInBaseLayout, button, heading, paragraph, divider, smallText } from './base'

const WEBSITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://w-timer.com'

export function buildWelcomeEmail(params: { displayName: string | null }): { subject: string; html: string } {
  const greeting = params.displayName ? `Hi ${params.displayName},` : 'Hi there,'

  const content = `
    ${heading('Welcome to Work Timer!')}
    ${paragraph(`${greeting}`)}
    ${paragraph('Your account is verified and ready to go. Start tracking your time with ease.')}

    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin: 24px 0;">
      <tr>
        <td style="padding: 12px 16px; background-color: #f5f5f4; border-radius: 8px;">
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
            <tr>
              <td style="padding: 8px 0;">
                <strong style="color: #1c1917; font-size: 14px;">&#9201; Three timer modes</strong>
                <br><span style="color: #78716c; font-size: 13px;">Stopwatch, manual entry, or Pomodoro</span>
              </td>
            </tr>
            <tr>
              <td style="padding: 8px 0;">
                <strong style="color: #1c1917; font-size: 14px;">&#128274; Privacy first</strong>
                <br><span style="color: #78716c; font-size: 13px;">Your data stays in your browser by default</span>
              </td>
            </tr>
            <tr>
              <td style="padding: 8px 0;">
                <strong style="color: #1c1917; font-size: 14px;">&#9729;&#65039; Optional cloud sync</strong>
                <br><span style="color: #78716c; font-size: 13px;">Sync across devices when you need it</span>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    ${button('Go to Dashboard', `${WEBSITE_URL}/dashboard`)}
    ${divider()}
    ${smallText('If you have any questions, reply to this email or contact us at support@w-timer.com.')}
  `

  return {
    subject: 'Welcome to Work Timer!',
    html: wrapInBaseLayout(content, 'Your account is ready. Start tracking your time today.'),
  }
}
