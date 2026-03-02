import { wrapInBaseLayout, button, heading, paragraph, divider, smallText } from './base'

export function buildMagicLinkEmail(params: {
  magicLinkUrl: string
  displayName: string | null
}): { subject: string; html: string } {
  const greeting = params.displayName ? `Hi ${params.displayName},` : 'Hi there,'

  const content = `
    ${heading('Sign In to Work Timer')}
    ${paragraph(greeting)}
    ${paragraph('Click the button below to sign in to your Work Timer account. No password needed.')}

    ${button('Sign In', params.magicLinkUrl)}

    ${paragraph('This link will expire in 24 hours and can only be used once. If you didn\'t request this link, you can safely ignore this email.')}
    ${divider()}
    ${smallText('If the button doesn\'t work, copy and paste this link into your browser:')}
    <p style="margin: 0; font-size: 12px; color: #6366f1; word-break: break-all;">
      <a href="${params.magicLinkUrl}" style="color: #6366f1; text-decoration: none;">${params.magicLinkUrl}</a>
    </p>
  `

  return {
    subject: 'Sign in to Work Timer',
    html: wrapInBaseLayout(content, 'Sign in to Work Timer with this magic link.'),
  }
}
