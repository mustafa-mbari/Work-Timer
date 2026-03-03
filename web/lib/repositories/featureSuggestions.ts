import { createClient } from '@/lib/supabase/server'
import type { DbFeatureSuggestion } from '@/lib/shared/types'

export type FeatureSuggestionSummary = Pick<
  DbFeatureSuggestion,
  'id' | 'title' | 'suggestion_type' | 'importance' | 'status' | 'target_platform' | 'created_at'
>

export async function getUserSuggestions(userId: string): Promise<FeatureSuggestionSummary[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('feature_suggestions')
    .select('id, title, suggestion_type, importance, status, target_platform, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .returns<FeatureSuggestionSummary[]>()
  return data ?? []
}

export async function createFeatureSuggestion(
  userId: string,
  data: {
    user_email: string
    user_name: string | null
    suggestion_type: string
    title: string
    description: string
    importance: string
    target_platform: string
    notify_on_release: boolean
  },
): Promise<{ data: DbFeatureSuggestion | null; error: { message: string } | null }> {
  const supabase = await createClient()
  const { data: suggestion, error } = await (supabase.from('feature_suggestions') as any)
    .insert({
      user_id: userId,
      user_email: data.user_email,
      user_name: data.user_name,
      suggestion_type: data.suggestion_type,
      title: data.title,
      description: data.description,
      importance: data.importance,
      target_platform: data.target_platform,
      notify_on_release: data.notify_on_release,
    })
    .select()
    .single()
  return { data: suggestion, error }
}
