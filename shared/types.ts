// Supabase database row types — mirror of the SQL schema in PLAN_2.md.
// Used by both the Chrome Extension (src/) and the companion website (web/).

export interface DbProfile {
  id: string                  // UUID — matches auth.users.id
  email: string
  display_name: string | null
  avatar_url: string | null
  role: 'user' | 'admin'
  created_at: string          // TIMESTAMPTZ ISO string
  updated_at: string
}

export interface DbSubscription {
  id: string
  user_id: string
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  plan: 'free' | 'premium_monthly' | 'premium_yearly' | 'premium_lifetime'
  status: 'active' | 'trialing' | 'past_due' | 'canceled' | 'unpaid' | 'incomplete'
  current_period_start: string | null
  current_period_end: string | null
  cancel_at_period_end: boolean
  granted_by: 'stripe' | 'domain' | 'promo' | 'admin_manual' | null
  promo_code_id: string | null
  created_at: string
  updated_at: string
}

export interface DbProject {
  id: string                  // nanoid — matches local Project.id
  user_id: string
  name: string
  color: string               // Hex color
  target_hours: number | null
  archived: boolean
  created_at: number          // Unix ms timestamp — matches local Project.createdAt
  updated_at: string          // TIMESTAMPTZ for sync cursor comparison
  deleted_at: string | null   // Soft delete
}

export interface DbTag {
  id: string
  user_id: string
  name: string
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface DbTimeEntry {
  id: string                  // nanoid — matches local TimeEntry.id
  user_id: string
  date: string                // YYYY-MM-DD
  start_time: number          // Unix ms
  end_time: number            // Unix ms
  duration: number            // ms
  project_id: string | null
  task_id: string | null
  description: string
  type: 'manual' | 'stopwatch' | 'pomodoro'
  tags: string[]
  link: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface DbUserSettings {
  user_id: string
  working_days: number
  week_start_day: 0 | 1
  idle_timeout: number
  theme: string
  language: string
  notifications: boolean
  daily_target: number | null
  weekly_target: number | null
  pomodoro_config: {
    workMinutes: number
    shortBreakMinutes: number
    longBreakMinutes: number
    sessionsBeforeLongBreak: number
    soundEnabled: boolean
  }
  floating_timer_auto: boolean
  updated_at: string
}

export interface DbSyncCursor {
  id: string
  user_id: string
  device_id: string
  last_sync: string           // TIMESTAMPTZ ISO string
  created_at: string
}

export interface DbPromoCode {
  id: string
  code: string
  discount_pct: number
  plan: 'premium_monthly' | 'premium_yearly' | 'premium_lifetime'
  max_uses: number | null
  current_uses: number
  valid_from: string
  valid_until: string | null
  active: boolean
  created_at: string
  created_by: string | null
}

export interface DbPromoRedemption {
  id: string
  promo_code_id: string
  user_id: string
  redeemed_at: string
}

export interface DbWhitelistedDomain {
  id: string
  domain: string
  plan: 'premium_monthly' | 'premium_yearly' | 'premium_lifetime'
  notes: string | null
  active: boolean
  created_at: string
  created_by: string | null
}

// ---------------------------------------------------------------------------
// Insert / Update helper types
// Insert: required fields that have no DB default must be provided; the rest optional
// Update: all fields optional (you only update what you need)
// ---------------------------------------------------------------------------

// Profiles — id comes from auth.users, created_at/updated_at have DB defaults
type DbProfileInsert = Pick<DbProfile, 'id' | 'email'> & Partial<Omit<DbProfile, 'id' | 'email'>>
type DbProfileUpdate = Partial<DbProfile>

// Subscriptions — id is auto UUID, created_at/updated_at have defaults, plan defaults to 'free'
type DbSubscriptionInsert = Pick<DbSubscription, 'user_id'> & Partial<Omit<DbSubscription, 'user_id'>>
type DbSubscriptionUpdate = Partial<DbSubscription>

// Projects — id is nanoid from client, user_id required, created_at/updated_at have defaults
type DbProjectInsert = Pick<DbProject, 'id' | 'user_id' | 'name' | 'color'> & Partial<Omit<DbProject, 'id' | 'user_id' | 'name' | 'color'>>
type DbProjectUpdate = Partial<DbProject>

// Tags — id is nanoid from client, user_id and name required
type DbTagInsert = Pick<DbTag, 'id' | 'user_id' | 'name'> & Partial<Omit<DbTag, 'id' | 'user_id' | 'name'>>
type DbTagUpdate = Partial<DbTag>

// TimeEntries — id is nanoid from client, most fields required for a valid entry
type DbTimeEntryInsert = Pick<DbTimeEntry, 'id' | 'user_id' | 'date' | 'start_time' | 'end_time' | 'duration' | 'type'> & Partial<Omit<DbTimeEntry, 'id' | 'user_id' | 'date' | 'start_time' | 'end_time' | 'duration' | 'type'>>
type DbTimeEntryUpdate = Partial<DbTimeEntry>

// UserSettings — user_id is the PK (references auth.users)
type DbUserSettingsInsert = Pick<DbUserSettings, 'user_id'> & Partial<Omit<DbUserSettings, 'user_id'>>
type DbUserSettingsUpdate = Partial<DbUserSettings>

// SyncCursors — id auto, user_id and device_id required
type DbSyncCursorInsert = Pick<DbSyncCursor, 'user_id' | 'device_id'> & Partial<Omit<DbSyncCursor, 'user_id' | 'device_id'>>
type DbSyncCursorUpdate = Partial<DbSyncCursor>

// PromoCodes — id auto, code/discount_pct/plan required
type DbPromoCodeInsert = Pick<DbPromoCode, 'code' | 'discount_pct' | 'plan'> & Partial<Omit<DbPromoCode, 'code' | 'discount_pct' | 'plan'>>
type DbPromoCodeUpdate = Partial<DbPromoCode>

// PromoRedemptions — id auto, promo_code_id and user_id required
type DbPromoRedemptionInsert = Pick<DbPromoRedemption, 'promo_code_id' | 'user_id'> & Partial<Omit<DbPromoRedemption, 'promo_code_id' | 'user_id'>>
type DbPromoRedemptionUpdate = Partial<DbPromoRedemption>

// WhitelistedDomains — id auto, domain and plan required
type DbWhitelistedDomainInsert = Pick<DbWhitelistedDomain, 'domain' | 'plan'> & Partial<Omit<DbWhitelistedDomain, 'domain' | 'plan'>>
type DbWhitelistedDomainUpdate = Partial<DbWhitelistedDomain>

// Database type map for @supabase/supabase-js typed client
export type Database = {
  public: {
    Tables: {
      profiles: { Row: DbProfile; Insert: DbProfileInsert; Update: DbProfileUpdate }
      subscriptions: { Row: DbSubscription; Insert: DbSubscriptionInsert; Update: DbSubscriptionUpdate }
      projects: { Row: DbProject; Insert: DbProjectInsert; Update: DbProjectUpdate }
      tags: { Row: DbTag; Insert: DbTagInsert; Update: DbTagUpdate }
      time_entries: { Row: DbTimeEntry; Insert: DbTimeEntryInsert; Update: DbTimeEntryUpdate }
      user_settings: { Row: DbUserSettings; Insert: DbUserSettingsInsert; Update: DbUserSettingsUpdate }
      sync_cursors: { Row: DbSyncCursor; Insert: DbSyncCursorInsert; Update: DbSyncCursorUpdate }
      promo_codes: { Row: DbPromoCode; Insert: DbPromoCodeInsert; Update: DbPromoCodeUpdate }
      promo_redemptions: { Row: DbPromoRedemption; Insert: DbPromoRedemptionInsert; Update: DbPromoRedemptionUpdate }
      whitelisted_domains: { Row: DbWhitelistedDomain; Insert: DbWhitelistedDomainInsert; Update: DbWhitelistedDomainUpdate }
    }
    Views: Record<string, never>
    Functions: {
      is_premium: { Args: { check_user_id: string }; Returns: boolean }
      check_domain_whitelist: { Args: { user_email: string }; Returns: Array<{ domain: string; plan: string }> }
    }
    Enums: Record<string, never>
  }
}
