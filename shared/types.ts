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
// Insert / Update helper types (flat object types for supabase-js compatibility)
// Insert: required fields that have no DB default must be provided; `?` = has DB default
// Update: all fields optional (you only update what you need)
// ---------------------------------------------------------------------------

interface DbProfileInsert {
  id: string
  email: string
  display_name?: string | null
  avatar_url?: string | null
  role?: 'user' | 'admin'
  created_at?: string
  updated_at?: string
}
interface DbProfileUpdate {
  id?: string
  email?: string
  display_name?: string | null
  avatar_url?: string | null
  role?: 'user' | 'admin'
  created_at?: string
  updated_at?: string
}

interface DbSubscriptionInsert {
  user_id: string
  id?: string
  stripe_customer_id?: string | null
  stripe_subscription_id?: string | null
  plan?: 'free' | 'premium_monthly' | 'premium_yearly' | 'premium_lifetime'
  status?: 'active' | 'trialing' | 'past_due' | 'canceled' | 'unpaid' | 'incomplete'
  current_period_start?: string | null
  current_period_end?: string | null
  cancel_at_period_end?: boolean
  granted_by?: 'stripe' | 'domain' | 'promo' | 'admin_manual' | null
  promo_code_id?: string | null
  created_at?: string
  updated_at?: string
}
interface DbSubscriptionUpdate {
  user_id?: string
  id?: string
  stripe_customer_id?: string | null
  stripe_subscription_id?: string | null
  plan?: 'free' | 'premium_monthly' | 'premium_yearly' | 'premium_lifetime'
  status?: 'active' | 'trialing' | 'past_due' | 'canceled' | 'unpaid' | 'incomplete'
  current_period_start?: string | null
  current_period_end?: string | null
  cancel_at_period_end?: boolean
  granted_by?: 'stripe' | 'domain' | 'promo' | 'admin_manual' | null
  promo_code_id?: string | null
  created_at?: string
  updated_at?: string
}

interface DbProjectInsert {
  id: string
  user_id: string
  name: string
  color: string
  target_hours?: number | null
  archived?: boolean
  created_at?: number
  updated_at?: string
  deleted_at?: string | null
}
interface DbProjectUpdate {
  id?: string
  user_id?: string
  name?: string
  color?: string
  target_hours?: number | null
  archived?: boolean
  created_at?: number
  updated_at?: string
  deleted_at?: string | null
}

interface DbTagInsert {
  id: string
  user_id: string
  name: string
  created_at?: string
  updated_at?: string
  deleted_at?: string | null
}
interface DbTagUpdate {
  id?: string
  user_id?: string
  name?: string
  created_at?: string
  updated_at?: string
  deleted_at?: string | null
}

interface DbTimeEntryInsert {
  id: string
  user_id: string
  date: string
  start_time: number
  end_time: number
  duration: number
  type: 'manual' | 'stopwatch' | 'pomodoro'
  project_id?: string | null
  task_id?: string | null
  description?: string
  tags?: string[]
  link?: string | null
  created_at?: string
  updated_at?: string
  deleted_at?: string | null
}
interface DbTimeEntryUpdate {
  id?: string
  user_id?: string
  date?: string
  start_time?: number
  end_time?: number
  duration?: number
  type?: 'manual' | 'stopwatch' | 'pomodoro'
  project_id?: string | null
  task_id?: string | null
  description?: string
  tags?: string[]
  link?: string | null
  created_at?: string
  updated_at?: string
  deleted_at?: string | null
}

interface DbUserSettingsInsert {
  user_id: string
  working_days?: number
  week_start_day?: 0 | 1
  idle_timeout?: number
  theme?: string
  language?: string
  notifications?: boolean
  daily_target?: number | null
  weekly_target?: number | null
  pomodoro_config?: DbUserSettings['pomodoro_config']
  floating_timer_auto?: boolean
  updated_at?: string
}
interface DbUserSettingsUpdate {
  user_id?: string
  working_days?: number
  week_start_day?: 0 | 1
  idle_timeout?: number
  theme?: string
  language?: string
  notifications?: boolean
  daily_target?: number | null
  weekly_target?: number | null
  pomodoro_config?: DbUserSettings['pomodoro_config']
  floating_timer_auto?: boolean
  updated_at?: string
}

interface DbSyncCursorInsert {
  user_id: string
  device_id: string
  id?: string
  last_sync?: string
  created_at?: string
}
interface DbSyncCursorUpdate {
  user_id?: string
  device_id?: string
  id?: string
  last_sync?: string
  created_at?: string
}

interface DbPromoCodeInsert {
  code: string
  discount_pct: number
  plan: 'premium_monthly' | 'premium_yearly' | 'premium_lifetime'
  id?: string
  max_uses?: number | null
  current_uses?: number
  valid_from?: string
  valid_until?: string | null
  active?: boolean
  created_at?: string
  created_by?: string | null
}
interface DbPromoCodeUpdate {
  code?: string
  discount_pct?: number
  plan?: 'premium_monthly' | 'premium_yearly' | 'premium_lifetime'
  id?: string
  max_uses?: number | null
  current_uses?: number
  valid_from?: string
  valid_until?: string | null
  active?: boolean
  created_at?: string
  created_by?: string | null
}

interface DbPromoRedemptionInsert {
  promo_code_id: string
  user_id: string
  id?: string
  redeemed_at?: string
}
interface DbPromoRedemptionUpdate {
  promo_code_id?: string
  user_id?: string
  id?: string
  redeemed_at?: string
}

interface DbWhitelistedDomainInsert {
  domain: string
  plan: 'premium_monthly' | 'premium_yearly' | 'premium_lifetime'
  id?: string
  notes?: string | null
  active?: boolean
  created_at?: string
  created_by?: string | null
}
interface DbWhitelistedDomainUpdate {
  domain?: string
  plan?: 'premium_monthly' | 'premium_yearly' | 'premium_lifetime'
  id?: string
  notes?: string | null
  active?: boolean
  created_at?: string
  created_by?: string | null
}

// Database type map for @supabase/supabase-js typed client
export type Database = {
  public: {
    Tables: {
      profiles: { Row: DbProfile; Insert: DbProfileInsert; Update: DbProfileUpdate; Relationships: [] }
      subscriptions: { Row: DbSubscription; Insert: DbSubscriptionInsert; Update: DbSubscriptionUpdate; Relationships: [] }
      projects: { Row: DbProject; Insert: DbProjectInsert; Update: DbProjectUpdate; Relationships: [] }
      tags: { Row: DbTag; Insert: DbTagInsert; Update: DbTagUpdate; Relationships: [] }
      time_entries: { Row: DbTimeEntry; Insert: DbTimeEntryInsert; Update: DbTimeEntryUpdate; Relationships: [] }
      user_settings: { Row: DbUserSettings; Insert: DbUserSettingsInsert; Update: DbUserSettingsUpdate; Relationships: [] }
      sync_cursors: { Row: DbSyncCursor; Insert: DbSyncCursorInsert; Update: DbSyncCursorUpdate; Relationships: [] }
      promo_codes: { Row: DbPromoCode; Insert: DbPromoCodeInsert; Update: DbPromoCodeUpdate; Relationships: [] }
      promo_redemptions: { Row: DbPromoRedemption; Insert: DbPromoRedemptionInsert; Update: DbPromoRedemptionUpdate; Relationships: [] }
      whitelisted_domains: { Row: DbWhitelistedDomain; Insert: DbWhitelistedDomainInsert; Update: DbWhitelistedDomainUpdate; Relationships: [] }
    }
    Views: Record<string, never>
    Functions: {
      is_premium: { Args: { check_user_id: string }; Returns: boolean }
      check_domain_whitelist: { Args: { user_email: string }; Returns: Array<{ domain: string; plan: string }> }
      get_platform_stats: { Args: Record<string, never>; Returns: {
        total_entries: number
        total_hours: number
        entry_count_30d: number
        project_count: number
        avg_session_ms: number
      }}
      get_active_users: { Args: { period: string }; Returns: number }
      get_user_growth: { Args: { weeks?: number }; Returns: Array<{
        week_start: string
        signup_count: number
      }>}
      get_top_users: { Args: { lim?: number }; Returns: Array<{
        user_id: string
        email: string
        total_hours: number
      }>}
      get_entry_type_breakdown: { Args: Record<string, never>; Returns: Array<{
        entry_type: string
        entry_count: number
        total_hours: number
      }>}
      get_premium_breakdown: { Args: Record<string, never>; Returns: {
        total_premium: number
        by_plan: Record<string, number> | null
        by_source: Record<string, number> | null
      }}
      get_promo_stats: { Args: Record<string, never>; Returns: {
        active_promos: number
        total_uses: number
      }}
      get_domain_stats: { Args: Record<string, never>; Returns: {
        active_domains: number
      }}
      get_user_analytics: { Args: { p_user_id: string }; Returns: {
        total_hours: number
        total_entries: number
        unique_days: number
        avg_session_ms: number
        streak: number
        weekly_data: Array<{ week: string; hours: number }> | null
        type_data: Array<{ name: string; hours: number; count: number }> | null
        day_of_week_data: Array<{ name: string; hours: number }> | null
        daily_data: Array<{ date: string; hours: number }> | null
        peak_hours_data: Array<{ hour: string; count: number }> | null
        project_stats: Array<{
          name: string
          color: string
          hours: number
          entries: number
          target_hours: number | null
        }> | null
      }}
      redeem_promo: { Args: { p_code: string; p_user_id: string }; Returns: {
        success: boolean
        error: string | null
        granted: boolean | null
        plan: string | null
        discount_pct: number | null
        promo_id: string | null
        promo_code: string | null
      }}
    }
    Enums: Record<string, never>
  }
}
