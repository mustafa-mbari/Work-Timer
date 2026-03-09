import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/shared/types'

type Tag = Database['public']['Tables']['tags']['Row']

export type TagSummary = Pick<Tag, 'id' | 'name'>

export type TagFull = Pick<Tag, 'id' | 'name' | 'color' | 'is_default' | 'sort_order' | 'hourly_rate' | 'earnings_enabled'>

export async function getUserTags(userId: string): Promise<TagFull[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('tags')
    .select('id, name, color, is_default, sort_order, hourly_rate, earnings_enabled')
    .eq('user_id', userId)
    .is('deleted_at', null)
    .order('sort_order', { ascending: true, nullsFirst: false })
    .order('name', { ascending: true })
    .returns<TagFull[]>()
  return data ?? []
}

export async function countUserTags(userId: string): Promise<number> {
  const supabase = await createClient()
  const { count } = await supabase
    .from('tags')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .is('deleted_at', null)
  return count ?? 0
}

export async function createTag(
  userId: string,
  data: { id: string; name: string; color?: string },
): Promise<{ error: { message: string } | null }> {
  const supabase = await createClient()
  const { error } = await supabase.from('tags').insert({
    id: data.id,
    user_id: userId,
    name: data.name,
    color: data.color ?? '#6366F1',
    is_default: false,
    sort_order: null,
  })
  return { error }
}

export async function updateTag(
  userId: string,
  id: string,
  data: { name?: string; color?: string; hourly_rate?: number | null; earnings_enabled?: boolean },
): Promise<{ error: { message: string } | null }> {
  const supabase = await createClient()
  const { error } = await supabase.from('tags')
    .update(data)
    .eq('id', id)
    .eq('user_id', userId)
  return { error }
}

export async function deleteTag(
  userId: string,
  id: string,
): Promise<{ error: { message: string } | null }> {
  const supabase = await createClient()
  const { error } = await supabase.from('tags')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', userId)
  return { error }
}

export async function setDefaultTag(
  userId: string,
  id: string,
): Promise<{ error: { message: string } | null }> {
  const supabase = await createClient()
  // Clear all defaults
  const { error: clearError } = await supabase.from('tags')
    .update({ is_default: false })
    .eq('user_id', userId)
    .is('deleted_at', null)
  if (clearError) return { error: clearError }
  // Set the selected one
  const { error } = await supabase.from('tags')
    .update({ is_default: true })
    .eq('id', id)
    .eq('user_id', userId)
  return { error }
}

export async function reorderTags(
  userId: string,
  orderedIds: string[],
): Promise<{ error: { message: string } | null }> {
  const supabase = await createClient()
  for (let i = 0; i < orderedIds.length; i++) {
    const { error } = await supabase.from('tags')
      .update({ sort_order: i })
      .eq('id', orderedIds[i])
      .eq('user_id', userId)
    if (error) return { error }
  }
  return { error: null }
}
