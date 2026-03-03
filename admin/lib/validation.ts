import { z } from 'zod'

const VALID_PLANS = [
  'premium_monthly', 'premium_yearly',
  'allin_monthly', 'allin_yearly',
  'team_10_monthly', 'team_10_yearly',
  'team_20_monthly', 'team_20_yearly',
] as const

// --- Promo codes ---
export const promoCreateSchema = z.object({
  code: z.string().min(3, 'Code must be 3-50 characters').max(50),
  discount_pct: z.number().int().min(1).max(100),
  plan: z.enum(VALID_PLANS),
  max_uses: z.number().int().min(1).nullable().optional().transform(v => v ?? null),
})

export const promoToggleSchema = z.object({
  id: z.string().uuid(),
  active: z.boolean(),
})

// --- Admin subscriptions ---
export const grantPremiumSchema = z.object({
  email: z.string().email('Valid email is required'),
  plan: z.enum(VALID_PLANS),
  current_period_end: z.string().nullable().optional(),
})

// --- Admin domains ---
const domainRegex = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/

export const domainCreateSchema = z.object({
  domain: z.string().regex(domainRegex, 'Invalid domain format'),
  plan: z.enum(VALID_PLANS),
})

export const domainToggleSchema = z.object({
  id: z.string().uuid(),
  active: z.boolean(),
})

// --- Admin Groups ---
export const adminUpdateGroupSchema = z.object({
  group_id: z.string().min(1),
  max_members: z.number().int().min(1).max(1000),
})

// --- Admin Emails ---
export const sendTestEmailSchema = z.object({
  to: z.string().email('Valid email is required'),
  template: z.enum([
    'welcome',
    'email_verification',
    'password_reset',
    'magic_link',
    'group_invitation',
    'password_reset_confirmation',
    'billing_notification',
    'invoice_receipt',
    'trial_ending',
  ]),
})

// --- Spam Check ---
export const spamCheckSchema = z.object({
  html: z.string().min(1).max(200_000),
  options: z.string().optional().default('long'),
})

// --- Admin Support Tickets ---
export const updateTicketStatusSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(['open', 'in_progress', 'resolved', 'closed']),
  admin_notes: z.string().max(5000).nullable().optional(),
})

// --- Admin Feature Suggestions ---
export const updateSuggestionStatusSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(['new', 'under_review', 'planned', 'in_progress', 'implemented', 'declined']),
  admin_notes: z.string().max(5000).nullable().optional(),
})

// --- Admin Ticket/Suggestion Reply ---
export const replyToTicketSchema = z.object({
  id: z.string().uuid(),
  message: z.string().min(1, 'Message is required').max(5000),
})

export const replyToSuggestionSchema = z.object({
  id: z.string().uuid(),
  message: z.string().min(1, 'Message is required').max(5000),
})

// Helper to parse and return a typed result or a 400 response
export function parseBody<T extends z.ZodType>(schema: T, data: unknown):
  { success: true; data: z.infer<T> } | { success: false; error: string } {
  const result = schema.safeParse(data)
  if (!result.success) {
    const msg = result.error.issues.map(e => e.message).join('; ')
    return { success: false, error: msg }
  }
  return { success: true, data: result.data }
}
