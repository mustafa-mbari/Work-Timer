import { createServiceClient } from '@/lib/supabase/server'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface SnapshotEntry {
  id: string
  date: string
  duration: number         // milliseconds
  description: string
  project_id: string | null
  project_name: string | null
  project_color: string | null
  tags: string[]           // tag IDs
  tag_names: string[]      // tag names for display
}

export interface GroupShare {
  id: string
  group_id: string
  user_id: string
  period_type: 'day' | 'week' | 'month'
  date_from: string        // YYYY-MM-DD
  date_to: string          // YYYY-MM-DD
  project_ids: string[] | null
  tag_ids: string[] | null
  entry_count: number
  total_hours: number
  entries: SnapshotEntry[]
  note: string | null
  created_at: string
}

export interface GroupShareWithMeta extends GroupShare {
  sharer_email: string
  sharer_name: string | null
}

export interface CreateShareParams {
  period_type: 'day' | 'week' | 'month'
  date_from: string
  date_to: string
  project_ids: string[] | null
  tag_ids: string[] | null
  note?: string
}

// ─── Repository Functions ─────────────────────────────────────────────────────

/**
 * Preview: dry-run — returns entry count + total hours without creating a share.
 */
export async function getSharePreview(
  userId: string,
  params: Omit<CreateShareParams, 'note'>,
): Promise<{ entry_count: number; total_hours: number }> {
  const supabase = await createServiceClient()

  let query = supabase
    .from('time_entries')
    .select('duration, tags, project_id')
    .eq('user_id', userId)
    .is('deleted_at', null)
    .gte('date', params.date_from)
    .lte('date', params.date_to)

  if (params.project_ids !== null) {
    query = query.in('project_id', params.project_ids)
  }

  const { data: entries } = await query
    .returns<Array<{ duration: number | null; tags: string[] | null; project_id: string | null }>>()

  if (!entries?.length) return { entry_count: 0, total_hours: 0 }

  // Tag filter (client-side because tags is an array column)
  const filtered = params.tag_ids === null
    ? entries
    : entries.filter(e => e.tags?.some(t => params.tag_ids!.includes(t)))

  const total_ms = filtered.reduce((sum, e) => sum + (e.duration ?? 0), 0)
  return {
    entry_count: filtered.length,
    total_hours: Math.round((total_ms / 3_600_000) * 100) / 100,
  }
}

/**
 * Build and persist a snapshot share.
 */
export async function createGroupShare(
  groupId: string,
  userId: string,
  params: CreateShareParams,
): Promise<{ data: GroupShare | null; error: { message: string } | null }> {
  const supabase = await createServiceClient()

  // 1. Fetch entries
  let query = supabase
    .from('time_entries')
    .select('id, date, duration, description, project_id, tags')
    .eq('user_id', userId)
    .is('deleted_at', null)
    .gte('date', params.date_from)
    .lte('date', params.date_to)

  if (params.project_ids !== null) {
    query = query.in('project_id', params.project_ids)
  }

  type RawEntry = { id: string; date: string; duration: number | null; description: string | null; project_id: string | null; tags: string[] | null }
  const { data: rawEntries } = await query.returns<RawEntry[]>()
  if (!rawEntries) return { data: null, error: { message: 'Failed to fetch entries' } }

  // Tag filter (client-side)
  const filtered = params.tag_ids === null
    ? rawEntries
    : rawEntries.filter(e => e.tags?.some(t => params.tag_ids!.includes(t)))

  // 2. Resolve project names/colors
  const projectIds = [...new Set(filtered.map(e => e.project_id).filter(Boolean) as string[])]
  type ProjectRow = { id: string; name: string; color: string }
  const projects: ProjectRow[] = projectIds.length
    ? ((await supabase.from('projects').select('id, name, color').in('id', projectIds).returns<ProjectRow[]>()).data ?? [])
    : []
  const projectMap = new Map(projects.map(p => [p.id, p]))

  // 3. Resolve tag names
  const allTagIds = [...new Set(filtered.flatMap(e => e.tags ?? []))]
  type TagRow = { id: string; name: string }
  const tags: TagRow[] = allTagIds.length
    ? ((await supabase.from('tags').select('id, name').in('id', allTagIds).returns<TagRow[]>()).data ?? [])
    : []
  const tagMap = new Map(tags.map(t => [t.id, t.name]))

  // 4. Build snapshot entries
  const entries: SnapshotEntry[] = filtered.map(e => {
    const proj = e.project_id ? projectMap.get(e.project_id) : null
    const entryTagIds: string[] = e.tags ?? []
    return {
      id: e.id,
      date: e.date,
      duration: e.duration ?? 0,
      description: e.description ?? '',
      project_id: e.project_id ?? null,
      project_name: proj?.name ?? null,
      project_color: proj?.color ?? null,
      tags: entryTagIds,
      tag_names: entryTagIds.map(id => tagMap.get(id) ?? id),
    }
  })

  const total_ms = entries.reduce((sum, e) => sum + e.duration, 0)
  const total_hours = Math.round((total_ms / 3_600_000) * 100) / 100

  // 5. Insert snapshot
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from('group_shares') as any)
    .insert({
      group_id:    groupId,
      user_id:     userId,
      period_type: params.period_type,
      date_from:   params.date_from,
      date_to:     params.date_to,
      project_ids: params.project_ids,
      tag_ids:     params.tag_ids,
      entry_count: entries.length,
      total_hours,
      entries,
      note:        params.note ?? null,
    })
    .select('*')
    .single()

  if (error) return { data: null, error: { message: error.message } }
  return { data: data as GroupShare, error: null }
}

/**
 * Get all shares in a group — enriched with sharer info (admin use).
 */
export async function getGroupShares(groupId: string): Promise<GroupShareWithMeta[]> {
  const supabase = await createServiceClient()

  const { data: shares } = await supabase
    .from('group_shares')
    .select('*')
    .eq('group_id', groupId)
    .order('created_at', { ascending: false })
    .returns<GroupShare[]>()

  if (!shares?.length) return []

  const userIds = [...new Set(shares.map(s => s.user_id))]
  type ProfileRow = { id: string; email: string; display_name: string | null }
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, email, display_name')
    .in('id', userIds)
    .returns<ProfileRow[]>()

  const profileMap = new Map((profiles ?? []).map(p => [p.id, p]))

  return shares.map(s => ({
    ...s,
    sharer_email: profileMap.get(s.user_id)?.email ?? '',
    sharer_name:  profileMap.get(s.user_id)?.display_name ?? null,
  }))
}

/**
 * Get a member's own shares in a group.
 */
export async function getMemberShares(groupId: string, userId: string): Promise<GroupShare[]> {
  const supabase = await createServiceClient()

  const { data } = await supabase
    .from('group_shares')
    .select('*')
    .eq('group_id', groupId)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .returns<GroupShare[]>()

  return data ?? []
}

/**
 * Delete a share — only the owner can delete.
 */
export async function deleteGroupShare(shareId: string, userId: string) {
  const supabase = await createServiceClient()
  const { error } = await supabase
    .from('group_shares')
    .delete()
    .eq('id', shareId)
    .eq('user_id', userId)
  return { error }
}
