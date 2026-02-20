import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/shared/types'

type Tag = Database['public']['Tables']['tags']['Row']

export type TagSummary = Pick<Tag, 'id' | 'name'>

export type TagFull = Pick<Tag, 'id' | 'name' | 'is_default' | 'sort_order'>

export async function getUserTags(userId: string): Promise<TagFull[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('tags')
    .select('id, name, is_default, sort_order')
    .eq('user_id', userId)
    .is('deleted_at', null)
    .order('sort_order', { ascending: true, nullsFirst: false })
    .order('name', { ascending: true })
    .returns<TagFull[]>()
  return data ?? []
}

export async function createTag(
  userId: string,
  data: { id: string; name: string },
): Promise<{ error: { message: string } | null }> {
  const supabase = await createClient()
  const { error } = await (supabase.from('tags') as any).insert({
    id: data.id,
    user_id: userId,
    name: data.name,
    is_default: false,
    sort_order: null,
    updated_at: new Date().toISOString(),
  })
  return { error }
}

export async function updateTag(
  userId: string,
  id: string,
  name: string,
): Promise<{ error: { message: string } | null }> {
  const supabase = await createClient()
  const { error } = await (supabase.from('tags') as any)
    .update({ name, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', userId)
  return { error }
}

export async function deleteTag(
  userId: string,
  id: string,
): Promise<{ error: { message: string } | null }> {
  const supabase = await createClient()
  const now = new Date().toISOString()
  const { error } = await (supabase.from('tags') as any)
    .update({ deleted_at: now, updated_at: now })
    .eq('id', id)
    .eq('user_id', userId)
  return { error }
}

export async function setDefaultTag(
  userId: string,
  id: string,
): Promise<{ error: { message: string } | null }> {
  const supabase = await createClient()
  const now = new Date().toISOString()
  // Clear all defaults
  const { error: clearError } = await (supabase.from('tags') as any)
    .update({ is_default: false, updated_at: now })
    .eq('user_id', userId)
    .is('deleted_at', null)
  if (clearError) return { error: clearError }
  // Set the selected one
  const { error } = await (supabase.from('tags') as any)
    .update({ is_default: true, updated_at: now })
    .eq('id', id)
    .eq('user_id', userId)
  return { error }
}

export async function reorderTags(
  userId: string,
  orderedIds: string[],
): Promise<{ error: { message: string } | null }> {
  const supabase = await createClient()
  const now = new Date().toISOString()
  for (let i = 0; i < orderedIds.length; i++) {
    const { error } = await (supabase.from('tags') as any)
      .update({ sort_order: i, updated_at: now })
      .eq('id', orderedIds[i])
      .eq('user_id', userId)
    if (error) return { error }
  }
  return { error: null }
}
