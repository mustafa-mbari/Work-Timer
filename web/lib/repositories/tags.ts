import { createClient } from '@/lib/supabase/server'

export interface TagSummary {
  id: string
  name: string
}

export async function getUserTags(userId: string): Promise<TagSummary[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('tags')
    .select('id, name')
    .eq('user_id', userId)
    .is('deleted_at', null)
    .order('name', { ascending: true })
    .returns<TagSummary[]>()
  return data ?? []
}
