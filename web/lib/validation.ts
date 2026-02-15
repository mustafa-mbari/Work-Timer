import { z } from 'zod'

const VALID_PLANS = ['premium_monthly', 'premium_yearly', 'premium_lifetime'] as const
type PremiumPlan = typeof VALID_PLANS[number]

// --- Checkout ---
export const checkoutSchema = z.object({
  plan: z.enum(['monthly', 'yearly', 'lifetime']),
})

// --- Promo codes ---
export const promoValidateSchema = z.object({
  code: z.string().min(1, 'Promo code is required').max(50),
})

export const promoRedeemSchema = z.object({
  code: z.string().min(1, 'Promo code is required').max(50),
})

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
