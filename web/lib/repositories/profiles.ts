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

export async function getProfile(userId: string): Promise<Pick<Profile, 'id' | 'display_name' | 'role'> | null> {
  const supabase = await createServiceClient()
  const { data } = await supabase
    .from('profiles')
    .select('id, display_name, role')
    .eq('id', userId)
    .single<Pick<Profile, 'id' | 'display_name' | 'role'>>()
  return data
}

export async function updateProfileDisplayName(userId: string, displayName: string | null) {
  const supabase = await createServiceClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (supabase.from('profiles') as any)
    .update({ display_name: displayName })
    .eq('id', userId)
}

