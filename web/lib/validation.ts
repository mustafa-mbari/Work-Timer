import { z } from 'zod'

const VALID_PLANS = ['premium_monthly', 'premium_yearly', 'premium_lifetime'] as const

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

// --- User settings ---
const pomodoroConfigSchema = z.object({
  workMinutes: z.number().int().min(1).max(120),
  shortBreakMinutes: z.number().int().min(1).max(60),
  longBreakMinutes: z.number().int().min(1).max(120),
  sessionsBeforeLongBreak: z.number().int().min(1).max(10),
  soundEnabled: z.boolean(),
})

const reminderConfigSchema = z.object({
  enabled: z.boolean(),
  dayOfWeek: z.number().int().min(0).max(6),
  hour: z.number().int().min(0).max(23),
  minute: z.number().int().min(0).max(59),
})

export const updateSettingsSchema = z.object({
  working_days: z.number().int().min(1).max(7).optional(),
  week_start_day: z.union([z.literal(0), z.literal(1)]).optional(),
  idle_timeout: z.number().int().min(1).max(480).optional(),
  theme: z.string().max(50).optional(),
  language: z.string().max(10).optional(),
  notifications: z.boolean().optional(),
  daily_target: z.number().min(0).max(24).nullable().optional(),
  weekly_target: z.number().min(0).max(168).nullable().optional(),
  pomodoro_config: pomodoroConfigSchema.optional(),
  floating_timer_auto: z.boolean().optional(),
  reminder: reminderConfigSchema.nullable().optional(),
})

// --- User profile ---
export const updateProfileSchema = z.object({
  displayName: z.string().max(100).nullable(),
})

// --- Devices ---
export const deleteDeviceSchema = z.object({
  device_id: z.string().min(1).max(200),
})

// --- Time Entries ---
export const createTimeEntrySchema = z.object({
  id: z.string().min(1).max(50),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
  start_time: z.number().int().positive(),
  end_time: z.number().int().positive(),
  duration: z.number().int().nonnegative(),
  type: z.enum(['manual', 'stopwatch', 'pomodoro']),
  project_id: z.string().nullable().optional(),
  task_id: z.string().nullable().optional(),
  description: z.string().max(1000).optional(),
  tags: z.array(z.string().max(100)).max(20).optional(),
  link: z.string().max(2000).nullable().optional(),
})

export const updateTimeEntrySchema = createTimeEntrySchema.omit({ id: true }).partial()

export const bulkDeleteEntriesSchema = z.object({
  ids: z.array(z.string().min(1)).min(1).max(500),
})

// --- Analytics filters ---
export const analyticsFilterSchema = z.object({
  dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  dateTo:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
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
