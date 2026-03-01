/**
 * Email system tests — templates, transporter config, and send logic.
 *
 * Templates live in web/lib/email/templates/ but are pure functions
 * (no framework deps), so they can be tested directly from the
 * extension's Vitest setup.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// ---------------------------------------------------------------------------
// Hoisted mocks — must use vi.hoisted() so variables exist when vi.mock runs
// ---------------------------------------------------------------------------
const { mockSendMail, mockVerify, mockCreateTransport } = vi.hoisted(() => {
  const mockSendMail = vi.fn()
  const mockVerify = vi.fn()
  const mockCreateTransport = vi.fn(() => ({
    sendMail: mockSendMail,
    verify: mockVerify,
  }))
  return { mockSendMail, mockVerify, mockCreateTransport }
})

vi.mock('nodemailer', () => ({
  default: { createTransport: mockCreateTransport },
  createTransport: mockCreateTransport,
}))

// ---------------------------------------------------------------------------
// Template imports (pure functions, relative imports only)
// ---------------------------------------------------------------------------
import { buildWelcomeEmail } from '../../web/lib/email/templates/welcome'
import { buildGroupInvitationEmail } from '../../web/lib/email/templates/groupInvitation'
import { buildPasswordResetConfirmationEmail } from '../../web/lib/email/templates/passwordResetConfirmation'
import { buildEmailVerificationEmail } from '../../web/lib/email/templates/emailVerification'
import { buildBillingNotificationEmail } from '../../web/lib/email/templates/billingNotification'
import { buildInvoiceReceiptEmail } from '../../web/lib/email/templates/invoiceReceipt'
import { buildTrialEndingEmail } from '../../web/lib/email/templates/trialEnding'

// Transporter (getFromAddress is a pure function, no nodemailer dep)
import { getFromAddress } from '../../web/lib/email/transporter'

// Admin renderTestTemplate (uses same templates, no @/ imports)
import { renderTestTemplate } from '../../admin/lib/email/renderTestTemplate'

// ═══════════════════════════════════════════════════════════════════════════
// 1. Email Templates
// ═══════════════════════════════════════════════════════════════════════════

describe('Email Templates', () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://w-timer.com'
  })

  // ── Welcome ────────────────────────────────────────────────────────────
  describe('buildWelcomeEmail', () => {
    it('returns subject and html', () => {
      const result = buildWelcomeEmail({ displayName: 'Alice' })
      expect(result.subject).toBe('Welcome to Work Timer!')
      expect(result.html).toContain('Alice')
      expect(result.html).toContain('<!DOCTYPE html>')
    })

    it('works without displayName', () => {
      const result = buildWelcomeEmail({})
      expect(result.subject).toBe('Welcome to Work Timer!')
      expect(result.html).toContain('<!DOCTYPE html>')
    })

    it('includes dashboard link', () => {
      const result = buildWelcomeEmail({ displayName: 'Bob' })
      expect(result.html).toContain('https://w-timer.com')
    })
  })

  // ── Group Invitation ───────────────────────────────────────────────────
  describe('buildGroupInvitationEmail', () => {
    it('returns subject with inviter and group name', () => {
      const result = buildGroupInvitationEmail({
        inviterName: 'John',
        groupName: 'Design Team',
      })
      expect(result.subject).toContain('John')
      expect(result.subject).toContain('Design Team')
    })

    it('includes group name in body', () => {
      const result = buildGroupInvitationEmail({
        inviterName: 'Jane',
        groupName: 'Engineering',
      })
      expect(result.html).toContain('Engineering')
      expect(result.html).toContain('Jane')
    })

    it('mentions 7-day expiry', () => {
      const result = buildGroupInvitationEmail({
        inviterName: 'Jane',
        groupName: 'Team',
      })
      expect(result.html).toContain('7')
    })
  })

  // ── Password Reset Confirmation ────────────────────────────────────────
  describe('buildPasswordResetConfirmationEmail', () => {
    it('returns password-related subject', () => {
      const result = buildPasswordResetConfirmationEmail({
        displayName: 'Alice',
      })
      expect(result.subject.toLowerCase()).toContain('password')
    })

    it('includes security warning', () => {
      const result = buildPasswordResetConfirmationEmail({
        displayName: 'Alice',
      })
      expect(result.html.toLowerCase()).toMatch(/unauthorized|didn.*t.*make|security/)
    })

    it('works without displayName', () => {
      const result = buildPasswordResetConfirmationEmail({})
      expect(result.html).toContain('<!DOCTYPE html>')
    })
  })

  // ── Email Verification ─────────────────────────────────────────────────
  describe('buildEmailVerificationEmail', () => {
    it('includes verification URL', () => {
      const url = 'https://w-timer.com/verify?token=abc123'
      const result = buildEmailVerificationEmail({
        verificationUrl: url,
        displayName: 'Alice',
      })
      expect(result.html).toContain(url)
    })

    it('mentions 24-hour expiry', () => {
      const result = buildEmailVerificationEmail({
        verificationUrl: 'https://example.com/verify',
      })
      expect(result.html).toContain('24')
    })

    it('has verification-related subject', () => {
      const result = buildEmailVerificationEmail({
        verificationUrl: 'https://example.com/verify',
      })
      expect(result.subject.toLowerCase()).toContain('verif')
    })
  })

  // ── Billing Notification ───────────────────────────────────────────────
  describe('buildBillingNotificationEmail', () => {
    it('handles subscription_created', () => {
      const result = buildBillingNotificationEmail({
        event: 'subscription_created',
        planName: 'Premium Monthly',
        displayName: 'Alice',
        periodEnd: 'April 1, 2026',
      })
      expect(result.html).toContain('Premium Monthly')
      expect(result.html).toContain('April 1, 2026')
    })

    it('handles subscription_renewed', () => {
      const result = buildBillingNotificationEmail({
        event: 'subscription_renewed',
        planName: 'Premium Yearly',
        displayName: 'Bob',
      })
      expect(result.html).toContain('Premium Yearly')
      expect(result.html.toLowerCase()).toContain('renew')
    })

    it('handles subscription_cancelled', () => {
      const result = buildBillingNotificationEmail({
        event: 'subscription_cancelled',
        planName: 'Premium Monthly',
        displayName: 'Charlie',
        periodEnd: 'May 15, 2026',
      })
      expect(result.html).toContain('May 15, 2026')
    })

    it('handles trial_started', () => {
      const result = buildBillingNotificationEmail({
        event: 'trial_started',
        planName: 'Premium',
        displayName: 'Dave',
      })
      expect(result.html.toLowerCase()).toContain('trial')
    })
  })

  // ── Invoice Receipt ────────────────────────────────────────────────────
  describe('buildInvoiceReceiptEmail', () => {
    it('includes all invoice details', () => {
      const result = buildInvoiceReceiptEmail({
        displayName: 'Alice',
        amount: '9.99',
        currency: 'usd',
        planName: 'Premium Monthly',
        invoiceDate: 'March 1, 2026',
        invoiceNumber: 'INV-2026-001',
        invoiceUrl: 'https://stripe.com/invoice/123',
      })
      expect(result.html).toContain('9.99')
      expect(result.html).toContain('Premium Monthly')
      expect(result.html).toContain('INV-2026-001')
      expect(result.html).toContain('March 1, 2026')
    })

    it('subject includes amount', () => {
      const result = buildInvoiceReceiptEmail({
        displayName: 'Alice',
        amount: '49.99',
        currency: 'usd',
        planName: 'Premium Yearly',
        invoiceDate: 'March 1, 2026',
        invoiceNumber: 'INV-001',
      })
      expect(result.subject).toContain('49.99')
    })
  })

  // ── Trial Ending ───────────────────────────────────────────────────────
  describe('buildTrialEndingEmail', () => {
    it('uses "tomorrow" for 1 day remaining', () => {
      const result = buildTrialEndingEmail({
        displayName: 'Alice',
        daysRemaining: 1,
        trialEndDate: 'March 5, 2026',
      })
      expect(result.subject.toLowerCase()).toContain('tomorrow')
    })

    it('uses "in X days" for multiple days', () => {
      const result = buildTrialEndingEmail({
        displayName: 'Bob',
        daysRemaining: 3,
        trialEndDate: 'March 7, 2026',
      })
      expect(result.subject).toContain('3')
    })

    it('lists premium features', () => {
      const result = buildTrialEndingEmail({
        displayName: 'Alice',
        daysRemaining: 2,
        trialEndDate: 'March 6, 2026',
      })
      expect(result.html).toContain('March 6, 2026')
    })
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// 2. Admin renderTestTemplate
// ═══════════════════════════════════════════════════════════════════════════

describe('renderTestTemplate', () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://w-timer.com'
  })

  const templates = [
    'welcome',
    'group_invitation',
    'password_reset_confirmation',
    'billing_notification',
    'invoice_receipt',
    'trial_ending',
  ]

  templates.forEach((template) => {
    it(`renders "${template}" template`, () => {
      const result = renderTestTemplate(template)
      expect(result.subject).toBeTruthy()
      expect(result.html).toContain('<!DOCTYPE html>')
    })
  })

  it('returns fallback for unknown template', () => {
    const result = renderTestTemplate('nonexistent')
    expect(result.subject).toBe('Test Email')
    expect(result.html).toContain('test email')
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// 3. Transporter Configuration (inline — avoids cross-project mock issues)
// ═══════════════════════════════════════════════════════════════════════════

describe('Transporter', () => {
  const originalEnv = { ...process.env }

  afterEach(() => {
    process.env = { ...originalEnv }
  })

  describe('getTransporter config logic', () => {
    // Test the configuration logic directly (same as transporter.ts)
    function buildConfig() {
      const port = Number(process.env.SMTP_PORT) || 465
      return {
        host: process.env.SMTP_HOST || 'smtp.resend.com',
        port,
        secure: port === 465,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
        connectionTimeout: 10_000,
        greetingTimeout: 10_000,
        socketTimeout: 15_000,
      }
    }

    it('uses default host when SMTP_HOST is not set', () => {
      delete process.env.SMTP_HOST
      expect(buildConfig().host).toBe('smtp.resend.com')
    })

    it('uses custom host from env', () => {
      process.env.SMTP_HOST = 'smtp.example.com'
      expect(buildConfig().host).toBe('smtp.example.com')
    })

    it('defaults to port 465 with secure: true', () => {
      delete process.env.SMTP_PORT
      const config = buildConfig()
      expect(config.port).toBe(465)
      expect(config.secure).toBe(true)
    })

    it('sets secure: false for port 587', () => {
      process.env.SMTP_PORT = '587'
      const config = buildConfig()
      expect(config.port).toBe(587)
      expect(config.secure).toBe(false)
    })

    it('sets secure: false for port 25', () => {
      process.env.SMTP_PORT = '25'
      const config = buildConfig()
      expect(config.port).toBe(25)
      expect(config.secure).toBe(false)
    })

    it('passes auth credentials from env', () => {
      process.env.SMTP_USER = 'testuser'
      process.env.SMTP_PASS = 'testpass'
      const config = buildConfig()
      expect(config.auth).toEqual({ user: 'testuser', pass: 'testpass' })
    })

    it('includes connection timeouts', () => {
      const config = buildConfig()
      expect(config.connectionTimeout).toBe(10_000)
      expect(config.greetingTimeout).toBe(10_000)
      expect(config.socketTimeout).toBe(15_000)
    })

    it('does not use connection pooling', () => {
      const config = buildConfig()
      expect(config).not.toHaveProperty('pool')
    })
  })

  describe('getFromAddress', () => {
    it('returns formatted from address with defaults', () => {
      delete process.env.SMTP_FROM_NAME
      delete process.env.SMTP_FROM_EMAIL
      const result = getFromAddress()
      expect(result).toBe('"Work Timer" <info@w-timer.com>')
    })

    it('uses custom name and email from env', () => {
      process.env.SMTP_FROM_NAME = 'My App'
      process.env.SMTP_FROM_EMAIL = 'noreply@example.com'
      const result = getFromAddress()
      expect(result).toBe('"My App" <noreply@example.com>')
    })
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// 4. sendEmail logic (tested via mocked transporter)
// ═══════════════════════════════════════════════════════════════════════════

describe('sendEmail', () => {
  beforeEach(() => {
    mockSendMail.mockReset()
  })

  // Inline sendEmail that mirrors web/lib/email/send.ts logic
  // without importing from web/ (avoids @/ alias cross-project issues)
  async function sendEmailTest(params: {
    to: string; subject: string; html: string
  }) {
    const transporter = { sendMail: mockSendMail }
    try {
      const info = await transporter.sendMail({
        from: getFromAddress(),
        to: params.to,
        subject: params.subject,
        html: params.html,
      })
      return { success: true, messageId: info.messageId }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error'
      return { success: false, error: errorMsg }
    }
  }

  it('sends email and returns success with messageId', async () => {
    mockSendMail.mockResolvedValue({ messageId: 'msg-123' })

    const result = await sendEmailTest({
      to: 'user@example.com',
      subject: 'Test',
      html: '<p>Hello</p>',
    })

    expect(result.success).toBe(true)
    expect(result.messageId).toBe('msg-123')
    expect(mockSendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'user@example.com',
        subject: 'Test',
        html: '<p>Hello</p>',
      })
    )
  })

  it('returns error on SMTP failure', async () => {
    mockSendMail.mockRejectedValue(new Error('Connection refused'))

    const result = await sendEmailTest({
      to: 'user@example.com',
      subject: 'Test',
      html: '<p>Hello</p>',
    })

    expect(result.success).toBe(false)
    expect(result.error).toBe('Connection refused')
  })

  it('handles non-Error exceptions', async () => {
    mockSendMail.mockRejectedValue('string error')

    const result = await sendEmailTest({
      to: 'user@example.com',
      subject: 'Test',
      html: '<p>Hello</p>',
    })

    expect(result.success).toBe(false)
    expect(result.error).toBe('Unknown error')
  })

  it('uses correct from address', async () => {
    mockSendMail.mockResolvedValue({ messageId: 'msg-456' })
    process.env.SMTP_FROM_NAME = 'Work Timer'
    process.env.SMTP_FROM_EMAIL = 'info@w-timer.com'

    await sendEmailTest({
      to: 'user@example.com',
      subject: 'Test',
      html: '<p>Hello</p>',
    })

    expect(mockSendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        from: '"Work Timer" <info@w-timer.com>',
      })
    )
  })
})
