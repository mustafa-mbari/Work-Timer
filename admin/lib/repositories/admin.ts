import { createServiceClient } from '@/lib/supabase/server'

async function callRpc(name: string, args?: Record<string, unknown>) {
  const supabase = await createServiceClient()
  return supabase.rpc(name as never, args as never)
}

export async function getAdminOverview() {
  const { data, error } = await callRpc('get_admin_overview')
  if (error) throw new Error(`get_admin_overview failed: ${error.message}`)
  return data as {
    total_users: number
    new_users_this_week: number
    recent_users: Array<{ email: string; display_name: string | null; created_at: string }>
  }
}

export async function getPlatformStats() {
  const { data, error } = await callRpc('get_platform_stats')
  if (error) throw new Error(`get_platform_stats failed: ${error.message}`)
  return data as {
    total_entries: number
    total_hours: number
    entry_count_30d: number
    project_count: number
    avg_session_ms: number
  }
}

export async function getActiveUsers(period: string): Promise<number> {
  const { data, error } = await callRpc('get_active_users', { period })
  if (error) throw new Error(`get_active_users failed: ${error.message}`)
  return (data as number) ?? 0
}

export async function getUserGrowth(weeks: number = 8) {
  const { data, error } = await callRpc('get_user_growth', { weeks })
  if (error) throw new Error(`get_user_growth failed: ${error.message}`)
  return (data ?? []) as Array<{ week_start: string; signup_count: number }>
}

export async function getTopUsers(lim: number = 5) {
  const { data, error } = await callRpc('get_top_users', { lim })
  if (error) throw new Error(`get_top_users failed: ${error.message}`)
  return (data ?? []) as Array<{ user_id: string; email: string; total_hours: number }>
}

export async function getEntryTypeBreakdown() {
  const { data, error } = await callRpc('get_entry_type_breakdown')
  if (error) throw new Error(`get_entry_type_breakdown failed: ${error.message}`)
  return (data ?? []) as Array<{ entry_type: string; entry_count: number; total_hours: number }>
}

export async function getPremiumBreakdown() {
  const { data, error } = await callRpc('get_premium_breakdown')
  if (error) throw new Error(`get_premium_breakdown failed: ${error.message}`)
  return data as {
    total_premium: number
    by_plan: Record<string, number> | null
    by_source: Record<string, number> | null
  }
}

export async function getPromoStats() {
  const { data, error } = await callRpc('get_promo_stats')
  if (error) throw new Error(`get_promo_stats failed: ${error.message}`)
  return data as { active_promos: number; total_uses: number }
}

export async function getDomainStats() {
  const { data, error } = await callRpc('get_domain_stats')
  if (error) throw new Error(`get_domain_stats failed: ${error.message}`)
  return data as { active_domains: number }
}

export async function getAuthUserCount(): Promise<number> {
  const supabase = await createServiceClient()
  const { data } = await supabase.auth.admin.listUsers({ perPage: 1 })
  return (data as any)?.total ?? data?.users?.length ?? 0
}

export async function getAuthUsers(page: number = 1, perPage: number = 15) {
  const supabase = await createServiceClient()
  const { data, error } = await supabase.auth.admin.listUsers({ page, perPage })
  if (error) throw new Error(`listUsers failed: ${error.message}`)
  return data
}

export async function getAllAuthUsers() {
  const supabase = await createServiceClient()
  const allUsers: any[] = []
  let page = 1
  const perPage = 1000
  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage })
    if (error) throw new Error(`listUsers failed: ${error.message}`)
    const users = data?.users ?? []
    allUsers.push(...users)
    if (users.length < perPage) break
    page++
  }
  return allUsers
}

export async function getAdminUsersPaged(page: number, perPage: number, search?: string) {
  const supabase = await createServiceClient()
  const from = (page - 1) * perPage
  const to = from + perPage - 1

  let query = supabase
    .from('profiles')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to)

  if (search) {
    query = query.or(`email.ilike.%${search}%,display_name.ilike.%${search}%`)
  }

  const { data, count, error } = await query
  if (error) throw new Error(`getAdminUsersPaged failed: ${error.message}`)

  return {
    users: data || [],
    totalCount: count || 0,
  }
}

export async function findAuthUserByEmail(email: string) {
  const supabase = await createServiceClient()
  // Query profiles table first (has email index), then fetch the auth user by ID
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', email)
    .single<{ id: string }>()
  if (profile) {
    const { data: userData } = await supabase.auth.admin.getUserById(profile.id)
    return userData?.user ?? null
  }
  // Fallback: search auth users directly (handles cases where profile doesn't exist yet)
  const { data } = await supabase.auth.admin.listUsers({ perPage: 1000 })
  return data?.users?.find(u => u.email === email) ?? null
}

// --- Admin Group Management ---

export async function getAdminGroups() {
  const { data, error } = await callRpc('admin_get_groups')
  if (error) throw new Error(`admin_get_groups failed: ${error.message}`)
  return (data ?? []) as Array<{
    id: string
    name: string
    owner_id: string
    owner_email: string
    join_code: string
    max_members: number
    member_count: number
    created_at: string
  }>
}

export async function updateGroupMaxMembers(groupId: string, maxMembers: number) {
  const { error } = await callRpc('admin_update_group', {
    p_group_id: groupId,
    p_max_members: maxMembers,
  })
  if (error) throw new Error(`admin_update_group failed: ${error.message}`)
}

// --- User Detail Management ---

export interface UserDetails {
  profile: {
    id: string
    email: string
    display_name: string | null
    role: string
    created_at: string
  }
  subscription: {
    plan: string
    status: string
    current_period_end: string | null
    granted_by: string | null
    stripe_subscription_id: string | null
    stripe_customer_id: string | null
    cancel_at_period_end: boolean
  } | null
  stats: {
    total_entries: number
    total_projects: number
    total_tags: number
    last_active_date: string | null
  }
}

export async function getUserDetails(userId: string): Promise<UserDetails> {
  const supabase = await createServiceClient()

  const [profileRes, subRes, entryCountRes, projectCountRes, tagCountRes, statsRes] = await Promise.all([
    supabase.from('profiles').select('id, email, display_name, role, created_at').eq('id', userId).single(),
    supabase.from('subscriptions').select('plan, status, current_period_end, granted_by, stripe_subscription_id, stripe_customer_id, cancel_at_period_end').eq('user_id', userId).maybeSingle(),
    supabase.from('time_entries').select('*', { count: 'exact', head: true }).eq('user_id', userId).is('deleted_at', null),
    supabase.from('projects').select('*', { count: 'exact', head: true }).eq('user_id', userId).is('deleted_at', null),
    supabase.from('tags').select('*', { count: 'exact', head: true }).eq('user_id', userId).is('deleted_at', null),
    supabase.from('user_stats').select('last_active_date').eq('user_id', userId).maybeSingle(),
  ])

  if (profileRes.error) throw new Error(`getUserDetails profile failed: ${profileRes.error.message}`)

  return {
    profile: profileRes.data as UserDetails['profile'],
    subscription: subRes.data as UserDetails['subscription'] | null,
    stats: {
      total_entries: entryCountRes.count ?? 0,
      total_projects: projectCountRes.count ?? 0,
      total_tags: tagCountRes.count ?? 0,
      last_active_date: (statsRes.data as { last_active_date: string | null } | null)?.last_active_date ?? null,
    },
  }
}

export async function deleteUser(userId: string): Promise<void> {
  const supabase = await createServiceClient()
  const { error } = await supabase.auth.admin.deleteUser(userId)
  if (error) throw new Error(`deleteUser failed: ${error.message}`)
}

export async function clearUserEntries(userId: string, dateFrom?: string, dateTo?: string): Promise<number> {
  const supabase = await createServiceClient()
  let query = supabase.from('time_entries').delete({ count: 'exact' }).eq('user_id', userId)
  if (dateFrom) query = query.gte('date', dateFrom)
  if (dateTo) query = query.lte('date', dateTo)
  const { count, error } = await query
  if (error) throw new Error(`clearUserEntries failed: ${error.message}`)
  return count ?? 0
}

export async function clearUserProjects(userId: string): Promise<number> {
  const supabase = await createServiceClient()
  const { count, error } = await supabase.from('projects').delete({ count: 'exact' }).eq('user_id', userId)
  if (error) throw new Error(`clearUserProjects failed: ${error.message}`)
  return count ?? 0
}

export async function clearUserTags(userId: string): Promise<number> {
  const supabase = await createServiceClient()
  const { count, error } = await supabase.from('tags').delete({ count: 'exact' }).eq('user_id', userId)
  if (error) throw new Error(`clearUserTags failed: ${error.message}`)
  return count ?? 0
}

export async function resetUserSettings(userId: string): Promise<void> {
  const supabase = await createServiceClient()
  const { error } = await supabase.from('user_settings').delete().eq('user_id', userId)
  if (error) throw new Error(`resetUserSettings failed: ${error.message}`)
}

export async function clearUserSyncCursors(userId: string): Promise<void> {
  const supabase = await createServiceClient()
  const { error } = await supabase.from('sync_cursors').delete().eq('user_id', userId)
  if (error) throw new Error(`clearUserSyncCursors failed: ${error.message}`)
}

export async function resetUserQuotas(userId: string): Promise<void> {
  const supabase = await createServiceClient()
  const [r1, r2] = await Promise.all([
    supabase.from('api_quota_usage').delete().eq('user_id', userId),
    supabase.from('export_usage').delete().eq('user_id', userId),
  ])
  if (r1.error) throw new Error(`resetUserQuotas api_quota failed: ${r1.error.message}`)
  if (r2.error) throw new Error(`resetUserQuotas export_usage failed: ${r2.error.message}`)
}

export async function updateUserRole(userId: string, role: 'admin' | 'user'): Promise<void> {
  const supabase = await createServiceClient()
  const { error } = await supabase.from('profiles').update({ role }).eq('id', userId)
  if (error) throw new Error(`updateUserRole failed: ${error.message}`)
}

export async function updateUserDisplayName(userId: string, displayName: string): Promise<void> {
  const supabase = await createServiceClient()
  const { error } = await supabase.from('profiles').update({ display_name: displayName }).eq('id', userId)
  if (error) throw new Error(`updateUserDisplayName failed: ${error.message}`)
}

export async function sendPasswordResetEmail(email: string): Promise<void> {
  const supabase = await createServiceClient()
  const { error } = await supabase.auth.admin.generateLink({
    type: 'recovery',
    email,
  })
  if (error) throw new Error(`sendPasswordResetEmail failed: ${error.message}`)
}
