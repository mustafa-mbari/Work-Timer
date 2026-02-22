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
  plan: 'free' | 'premium_monthly' | 'premium_yearly' | 'premium_lifetime' | 'allin_monthly' | 'allin_yearly'
  status: 'active' | 'trialing' | 'past_due' | 'canceled' | 'unpaid' | 'incomplete'
  current_period_start: string | null
  current_period_end: string | null
  cancel_at_period_end: boolean
  granted_by: 'stripe' | 'domain' | 'promo' | 'admin_manual' | null
  promo_code_id: string | null
  group_id: string | null
  created_at: string
  updated_at: string
}

export interface DbProject {
  id: string                  // nanoid — matches local Project.id
  user_id: string
  name: string
  color: string               // Hex color
  target_hours: number | null
  hourly_rate: number | null
  earnings_enabled: boolean
  archived: boolean
  is_default: boolean
  sort_order: number | null
  created_at: number          // Unix ms timestamp — matches local Project.createdAt
  updated_at: string          // TIMESTAMPTZ for sync cursor comparison
  deleted_at: string | null   // Soft delete
}

export interface DbTag {
  id: string
  user_id: string
  name: string
  is_default: boolean
  sort_order: number | null
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
  default_hourly_rate: number | null
  currency: string
  min_billable_minutes: number
  floating_timer_auto: boolean
  reminder: {
    enabled: boolean
    dayOfWeek: number
    hour: number
    minute: number
  }
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
  plan: 'premium_monthly' | 'premium_yearly' | 'premium_lifetime' | 'allin_monthly' | 'allin_yearly'
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

export interface DbUserStats {
  user_id: string
  total_hours: number
  total_entries: number
  total_projects: number
  active_days: number
  last_active_date: string | null
  updated_at: string
}

export interface DbWhitelistedDomain {
  id: string
  domain: string
  plan: 'premium_monthly' | 'premium_yearly' | 'premium_lifetime' | 'allin_monthly' | 'allin_yearly'
  notes: string | null
  active: boolean
  created_at: string
  created_by: string | null
}

export interface DbGroup {
  id: string
  name: string
  owner_id: string
  join_code: string | null
  max_members: number
  created_at: string
}

export interface DbGroupMember {
  group_id: string
  user_id: string
  role: 'admin' | 'member'
  created_at: string
}

export interface DbGroupInvitation {
  id: string
  group_id: string
  email: string
  invited_by: string
  status: 'pending' | 'accepted' | 'declined' | 'expired'
  created_at: string
  expires_at: string
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
  plan?: DbSubscription['plan']
  status?: DbSubscription['status']
  current_period_start?: string | null
  current_period_end?: string | null
  cancel_at_period_end?: boolean
  granted_by?: 'stripe' | 'domain' | 'promo' | 'admin_manual' | null
  promo_code_id?: string | null
  group_id?: string | null
  created_at?: string
  updated_at?: string
}
interface DbSubscriptionUpdate {
  user_id?: string
  id?: string
  stripe_customer_id?: string | null
  stripe_subscription_id?: string | null
  plan?: DbSubscription['plan']
  status?: DbSubscription['status']
  current_period_start?: string | null
  current_period_end?: string | null
  cancel_at_period_end?: boolean
  granted_by?: 'stripe' | 'domain' | 'promo' | 'admin_manual' | null
  promo_code_id?: string | null
  group_id?: string | null
  created_at?: string
  updated_at?: string
}

interface DbProjectInsert {
  id: string
  user_id: string
  name: string
  color: string
  target_hours?: number | null
  hourly_rate?: number | null
  earnings_enabled?: boolean
  archived?: boolean
  is_default?: boolean
  sort_order?: number | null
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
  hourly_rate?: number | null
  earnings_enabled?: boolean
  archived?: boolean
  is_default?: boolean
  sort_order?: number | null
  created_at?: number
  updated_at?: string
  deleted_at?: string | null
}

interface DbTagInsert {
  id: string
  user_id: string
  name: string
  is_default?: boolean
  sort_order?: number | null
  created_at?: string
  updated_at?: string
  deleted_at?: string | null
}
interface DbTagUpdate {
  id?: string
  user_id?: string
  name?: string
  is_default?: boolean
  sort_order?: number | null
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
  default_hourly_rate?: number | null
  currency?: string
  floating_timer_auto?: boolean
  reminder?: DbUserSettings['reminder']
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
  default_hourly_rate?: number | null
  currency?: string
  floating_timer_auto?: boolean
  reminder?: DbUserSettings['reminder']
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
  plan: DbPromoCode['plan']
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

interface DbUserStatsInsert {
  user_id: string
  total_hours?: number
  total_entries?: number
  total_projects?: number
  active_days?: number
  last_active_date?: string | null
  updated_at?: string
}
interface DbUserStatsUpdate {
  user_id?: string
  total_hours?: number
  total_entries?: number
  total_projects?: number
  active_days?: number
  last_active_date?: string | null
  updated_at?: string
}

interface DbWhitelistedDomainInsert {
  domain: string
  plan: DbWhitelistedDomain['plan']
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

export interface DbGroupSharingSettings {
  group_id: string
  user_id: string
  sharing_enabled: boolean
  shared_project_ids: string[] | null
  created_at: string
  updated_at: string
}

// --- Group types ---
interface DbGroupSharingSettingsInsert {
  group_id: string
  user_id: string
  sharing_enabled?: boolean
  shared_project_ids?: string[] | null
  created_at?: string
  updated_at?: string
}
interface DbGroupSharingSettingsUpdate {
  group_id?: string
  user_id?: string
  sharing_enabled?: boolean
  shared_project_ids?: string[] | null
  created_at?: string
  updated_at?: string
}

interface DbGroupInsert {
  name: string
  owner_id: string
  id?: string
  join_code?: string | null
  max_members?: number
  created_at?: string
}
interface DbGroupUpdate {
  name?: string
  owner_id?: string
  id?: string
  join_code?: string | null
  max_members?: number
  created_at?: string
}

interface DbGroupMemberInsert {
  group_id: string
  user_id: string
  role?: 'admin' | 'member'
  created_at?: string
}
interface DbGroupMemberUpdate {
  group_id?: string
  user_id?: string
  role?: 'admin' | 'member'
  created_at?: string
}

interface DbGroupInvitationInsert {
  group_id: string
  email: string
  invited_by: string
  id?: string
  status?: DbGroupInvitation['status']
  created_at?: string
  expires_at?: string
}
interface DbGroupInvitationUpdate {
  group_id?: string
  email?: string
  invited_by?: string
  id?: string
  status?: DbGroupInvitation['status']
  created_at?: string
  expires_at?: string
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
      user_stats: { Row: DbUserStats; Insert: DbUserStatsInsert; Update: DbUserStatsUpdate; Relationships: [] }
      groups: { Row: DbGroup; Insert: DbGroupInsert; Update: DbGroupUpdate; Relationships: [] }
      group_members: { Row: DbGroupMember; Insert: DbGroupMemberInsert; Update: DbGroupMemberUpdate; Relationships: [] }
      group_invitations: { Row: DbGroupInvitation; Insert: DbGroupInvitationInsert; Update: DbGroupInvitationUpdate; Relationships: [] }
      group_sharing_settings: { Row: DbGroupSharingSettings; Insert: DbGroupSharingSettingsInsert; Update: DbGroupSharingSettingsUpdate; Relationships: [] }
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
        daily_project_data: Array<{ date: string; project_id: string; project_name: string; project_color: string; hours: number }> | null
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
      get_earnings_report: { Args: { p_user_id: string; p_date_from?: string; p_date_to?: string }; Returns: {
        currency: string
        default_rate: number
        projects: Array<{
          id: string
          name: string
          color: string
          hours: number
          rate: number
          total: number
        }>
        grand_total: number
        total_hours: number
        total_projects: number
        daily_earnings: Array<{ date: string; project_id: string; project_name: string; project_color: string; total: number }> | null
      }}
      get_group_analytics: { Args: { p_group_id: string; p_user_id: string; p_date_from?: string; p_date_to?: string }; Returns: {
        total_hours: number
        total_entries: number
        member_count: number
        member_stats: Array<{
          user_id: string
          display_name: string
          email: string
          hours: number
          entries: number
        }>
        project_stats: Array<{
          name: string
          color: string
          hours: number
          entries: number
        }>
        weekly_data: Array<{ week: string; hours: number }> | null
        error?: string
      }}
      admin_get_groups: { Args: Record<string, never>; Returns: Array<{
        id: string
        name: string
        owner_id: string
        owner_email: string
        join_code: string | null
        max_members: number
        member_count: number
        created_at: string
      }>}
      admin_update_group: { Args: { p_group_id: string; p_max_members: number }; Returns: {
        success: boolean
        error?: string
      }}
      get_group_members_summary: { Args: { p_group_id: string; p_admin_id: string }; Returns: {
        members: Array<{
          user_id: string
          display_name: string
          email: string
          role: string
          sharing_enabled: boolean
          current_week_hours: number
          last_week_hours: number
          current_month_hours: number
          last_month_hours: number
        }>
        error?: string
      }}
      get_group_member_entries: { Args: { p_group_id: string; p_admin_id: string; p_member_id: string; p_date_from?: string; p_date_to?: string }; Returns: {
        entries: Array<{
          id: string
          date: string
          start_time: number
          end_time: number
          duration: number
          description: string | null
          project_id: string | null
          project_name: string
          project_color: string
        }>
        error?: string
      }}
    }
    Enums: Record<string, never>
  }
}
