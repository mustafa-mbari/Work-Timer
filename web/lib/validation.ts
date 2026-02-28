import { z } from 'zod'

// --- Checkout ---
export const checkoutSchema = z.object({
  plan: z.enum([
    'monthly', 'yearly',                    // Pro plans (map to premium_*)
    'team_10_monthly', 'team_10_yearly',    // Team 10 plans
    'team_20_monthly', 'team_20_yearly',    // Team 20 plans
    'allin_monthly', 'allin_yearly',        // Legacy
  ]),
})

// --- Promo codes ---
export const promoValidateSchema = z.object({
  code: z.string().min(1, 'Promo code is required').max(50),
})

export const promoRedeemSchema = z.object({
  code: z.string().min(1, 'Promo code is required').max(50),
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
  default_hourly_rate: z.number().min(0).max(10000).nullable().optional(),
  currency: z.string().min(3).max(3).optional(),
  min_billable_minutes: z.number().int().min(1).max(480).optional(),
  floating_timer_auto: z.boolean().optional(),
  reminder: reminderConfigSchema.nullable().optional(),
  entry_save_time: z.number().int().min(5).max(240).optional(),
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

// --- Projects ---
export const createProjectSchema = z.object({
  id: z.string().min(1).max(50),
  name: z.string().min(1, 'Name is required').max(100),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Invalid color'),
  target_hours: z.number().min(0).max(10000).nullable().optional(),
  hourly_rate: z.number().min(0).max(10000).nullable().optional(),
})

export const updateProjectSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  target_hours: z.number().min(0).max(10000).nullable().optional(),
  hourly_rate: z.number().min(0).max(10000).nullable().optional(),
  earnings_enabled: z.boolean().optional(),
  default_tag_id: z.string().max(50).nullable().optional(),
  archived: z.boolean().optional(),
})

export const reorderSchema = z.object({
  ids: z.array(z.string().min(1)).min(1).max(200),
})

// --- Tags ---
export const createTagSchema = z.object({
  id: z.string().min(1).max(50),
  name: z.string().min(1, 'Name is required').max(50),
})

export const updateTagSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  hourly_rate: z.number().min(0).max(10000).nullable().optional(),
  earnings_enabled: z.boolean().optional(),
})

// --- Analytics filters ---
export const analyticsFilterSchema = z.object({
  dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  dateTo:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
})

// --- Groups ---
export const createGroupSchema = z.object({
  name: z.string().min(1, 'Group name is required').max(100),
})

export const updateGroupSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  share_frequency: z.enum(['daily', 'weekly', 'monthly']).nullable().optional(),
  share_deadline_day: z.number().int().min(0).max(31).nullable().optional(),
})

export const inviteMemberSchema = z.object({
  email: z.string().email('Valid email is required'),
})

export const joinGroupSchema = z.object({
  code: z.string().min(1, 'Join code is required').max(20),
})

export const updateGroupMemberSchema = z.object({
  role: z.enum(['admin', 'member']),
})

export const updateShareDraftSchema = z.object({
  project_ids: z.array(z.string()).nullable().optional(),
  tag_ids: z.array(z.string()).nullable().optional(),
  note: z.string().max(280).nullable().optional(),
})

export const invitationActionSchema = z.object({
  invitation_id: z.string().min(1),
  action: z.enum(['accept', 'decline']),
})

// --- Earnings ---
export const earningsFilterSchema = z.object({
  dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
})

// --- Group Sharing ---
export const updateSharingSettingsSchema = z.object({
  sharing_enabled: z.boolean(),
  shared_project_ids: z.array(z.string()).nullable().optional().transform(v => v ?? null),
})

// --- Group Shares (snapshot model) ---
const dateRegex = /^\d{4}-\d{2}-\d{2}$/
export const createShareSchema = z.object({
  period_type: z.enum(['day', 'week', 'month']),
  date_from:   z.string().regex(dateRegex, 'Invalid date'),
  date_to:     z.string().regex(dateRegex, 'Invalid date'),
  project_ids: z.array(z.string()).nullable().default(null),
  tag_ids:     z.array(z.string()).nullable().default(null),
  note:        z.string().max(280).optional(),
})
export const sharePreviewSchema = createShareSchema

// --- Group Admin Bulk Share Creation ---
export const adminCreateShareSchema = z.object({
  period_type: z.enum(['day', 'week', 'month']),
  date_from:   z.string().regex(dateRegex, 'Invalid date'),
  date_to:     z.string().regex(dateRegex, 'Invalid date'),
  due_date:    z.string().regex(dateRegex, 'Invalid date').nullable().optional().transform(v => v ?? null),
})

// --- Share Approval Workflow ---
export const submitShareSchema = z.object({
  project_ids: z.array(z.string()).nullable().default(null),
  tag_ids:     z.array(z.string()).nullable().default(null),
})

export const reviewShareSchema = z.object({
  action:  z.enum(['approve', 'deny']),
  comment: z.string().max(500).optional(),
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
