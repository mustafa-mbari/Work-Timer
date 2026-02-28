import { createServiceClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/shared/types'

type Profile = Database['public']['Tables']['profiles']['Row']

export async function getProfileRole(userId: string): Promise<string | null> {
  const supabase = await createServiceClient()
  const { data } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single<Pick<Profile, 'role'>>()
  return data?.role ?? null
}

export async function getAllProfiles(): Promise<Pick<Profile, 'id' | 'display_name' | 'role'>[]> {
  const supabase = await createServiceClient()
  const { data } = await supabase
    .from('profiles')
    .select('id, display_name, role')
    .range(0, 49999)
    .returns<Pick<Profile, 'id' | 'display_name' | 'role'>[]>()
  return data ?? []
}
