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
  plan: 'premium_monthly' | 'premium_yearly'
  max_uses: number | null
  current_uses: number
  valid_from: string
  valid_until: string | null
  active: boolean
  created_at: string
  created_by: string | null
}

export interface DbWhitelistedDomain {
  id: string
  domain: string
  plan: 'premium_monthly' | 'premium_yearly'
  notes: string | null
  active: boolean
  created_at: string
  created_by: string | null
}

// Database type map for @supabase/supabase-js typed client
export type Database = {
  public: {
    Tables: {
      profiles: { Row: DbProfile; Insert: Partial<DbProfile>; Update: Partial<DbProfile> }
      subscriptions: { Row: DbSubscription; Insert: Partial<DbSubscription>; Update: Partial<DbSubscription> }
      projects: { Row: DbProject; Insert: Partial<DbProject>; Update: Partial<DbProject> }
      tags: { Row: DbTag; Insert: Partial<DbTag>; Update: Partial<DbTag> }
      time_entries: { Row: DbTimeEntry; Insert: Partial<DbTimeEntry>; Update: Partial<DbTimeEntry> }
      user_settings: { Row: DbUserSettings; Insert: Partial<DbUserSettings>; Update: Partial<DbUserSettings> }
      sync_cursors: { Row: DbSyncCursor; Insert: Partial<DbSyncCursor>; Update: Partial<DbSyncCursor> }
      promo_codes: { Row: DbPromoCode; Insert: Partial<DbPromoCode>; Update: Partial<DbPromoCode> }
      whitelisted_domains: { Row: DbWhitelistedDomain; Insert: Partial<DbWhitelistedDomain>; Update: Partial<DbWhitelistedDomain> }
    }
    Views: Record<string, never>
    Functions: {
      is_premium: { Args: { check_user_id: string }; Returns: boolean }
      check_domain_whitelist: { Args: { user_email: string }; Returns: Array<{ domain: string; plan: string }> }
    }
    Enums: Record<string, never>
  }
}
