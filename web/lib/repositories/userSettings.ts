import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/shared/types'

type UserSettings = Database['public']['Tables']['user_settings']['Row']

// `reminder` was added in migration 009 but is not in the shared TypeScript type
export type ReminderConfig = {
  enabled: boolean
  dayOfWeek: number
  hour: number
  minute: number
}

// Extended type that includes the DB-only `reminder` column
export type UserSettingsFull = UserSettings & { reminder?: ReminderConfig | null }

export type SettingsUpdate = Partial<Omit<UserSettings, 'user_id' | 'updated_at'>> & {
  reminder?: ReminderConfig | null
}

export async function getUserSettings(userId: string): Promise<UserSettingsFull | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('user_settings')
    .select('*')
    .eq('user_id', userId)
    .single<UserSettingsFull>()
  return data
}

export async function upsertUserSettings(userId: string, update: SettingsUpdate) {
  const supabase = await createClient()
  return supabase.from('user_settings').upsert(
    { user_id: userId, ...update },
    { onConflict: 'user_id' }
  )
}
