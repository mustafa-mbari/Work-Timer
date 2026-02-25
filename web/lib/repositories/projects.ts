import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/shared/types'

type Project = Database['public']['Tables']['projects']['Row']

export type ProjectSummary = Pick<Project, 'id' | 'name' | 'color' | 'archived' | 'default_tag_id'>

export type ProjectFull = Pick<
  Project,
  'id' | 'name' | 'color' | 'archived' | 'is_default' | 'sort_order' | 'target_hours' | 'hourly_rate' | 'earnings_enabled' | 'default_tag_id' | 'created_at'
>

export async function getUserProjects(userId: string): Promise<ProjectFull[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('projects')
    .select('id, name, color, archived, is_default, sort_order, target_hours, hourly_rate, earnings_enabled, default_tag_id, created_at')
    .eq('user_id', userId)
    .is('deleted_at', null)
    .order('sort_order', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: true })
    .returns<ProjectFull[]>()
  return data ?? []
}

export async function countUserProjects(userId: string): Promise<number> {
  const supabase = await createClient()
  const { count } = await supabase
    .from('projects')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .is('deleted_at', null)
  return count ?? 0
}

export async function createProject(
  userId: string,
  data: { id: string; name: string; color: string; target_hours?: number | null; hourly_rate?: number | null },
): Promise<{ error: { message: string } | null }> {
  const supabase = await createClient()
  const { error } = await (supabase.from('projects') as any).insert({
    id: data.id,
    user_id: userId,
    name: data.name,
    color: data.color,
    target_hours: data.target_hours ?? null,
    hourly_rate: data.hourly_rate ?? null,
    archived: false,
    is_default: false,
    sort_order: null,
    created_at: Date.now(),
    updated_at: new Date().toISOString(),
  })
  return { error }
}

export async function updateProject(
  userId: string,
  id: string,
  data: { name?: string; color?: string; target_hours?: number | null; hourly_rate?: number | null; earnings_enabled?: boolean; default_tag_id?: string | null; archived?: boolean },
): Promise<{ error: { message: string } | null }> {
  const supabase = await createClient()
  const { error } = await (supabase.from('projects') as any)
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', userId)
  return { error }
}

export async function deleteProject(
  userId: string,
  id: string,
): Promise<{ error: { message: string } | null }> {
  const supabase = await createClient()
  const now = new Date().toISOString()
  const { error } = await (supabase.from('projects') as any)
    .update({ deleted_at: now, updated_at: now })
    .eq('id', id)
    .eq('user_id', userId)
  return { error }
}

export async function setDefaultProject(
  userId: string,
  id: string,
): Promise<{ error: { message: string } | null }> {
  const supabase = await createClient()
  const now = new Date().toISOString()
  // Clear all defaults for user
  const { error: clearError } = await (supabase.from('projects') as any)
    .update({ is_default: false, updated_at: now })
    .eq('user_id', userId)
    .is('deleted_at', null)
  if (clearError) return { error: clearError }
  // Set the selected one
  const { error } = await (supabase.from('projects') as any)
    .update({ is_default: true, updated_at: now })
    .eq('id', id)
    .eq('user_id', userId)
  return { error }
}

export async function reorderProjects(
  userId: string,
  orderedIds: string[],
): Promise<{ error: { message: string } | null }> {
  const supabase = await createClient()
  const now = new Date().toISOString()
  for (let i = 0; i < orderedIds.length; i++) {
    const { error } = await (supabase.from('projects') as any)
      .update({ sort_order: i, updated_at: now })
      .eq('id', orderedIds[i])
      .eq('user_id', userId)
    if (error) return { error }
  }
  return { error: null }
}
