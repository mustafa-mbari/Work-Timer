import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/shared/types'

type Project = Database['public']['Tables']['projects']['Row']

export type ProjectSummary = Pick<Project, 'id' | 'name' | 'color' | 'archived'>

export async function getUserProjects(userId: string): Promise<ProjectSummary[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('projects')
    .select('id, name, color, archived')
    .eq('user_id', userId)
    .is('deleted_at', null)
    .order('name', { ascending: true })
    .returns<ProjectSummary[]>()
  return data ?? []
}
