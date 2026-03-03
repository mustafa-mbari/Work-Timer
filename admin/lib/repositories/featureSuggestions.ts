import { createServiceClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/shared/types'

type FeatureSuggestion = Database['public']['Tables']['feature_suggestions']['Row']

export async function getAllSuggestions(filters?: { status?: string; importance?: string }) {
  const supabase = await createServiceClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- supabase-js v2.97+ type narrowing issue with chained .eq() after .returns()
  let query: any = supabase
    .from('feature_suggestions')
    .select('id, user_id, user_email, user_name, suggestion_type, title, description, importance, target_platform, notify_on_release, status, admin_notes, created_at, updated_at')
    .order('created_at', { ascending: false })

  if (filters?.status) {
    query = query.eq('status', filters.status)
  }
  if (filters?.importance) {
    query = query.eq('importance', filters.importance)
  }

  const { data } = await query
  return (data ?? []) as FeatureSuggestion[]
}

export async function getSuggestionById(id: string) {
  const supabase = await createServiceClient()
  const { data } = await supabase
    .from('feature_suggestions')
    .select('*')
    .eq('id', id)
    .single<FeatureSuggestion>()
  return data
}

export async function updateSuggestionStatus(id: string, status: string, adminNotes?: string | null) {
  const supabase = await createServiceClient()
  const update: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
  }
  if (adminNotes !== undefined) {
    update.admin_notes = adminNotes
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- supabase-js v2.95 resolves Update type to `never`
  return (supabase.from('feature_suggestions') as any).update(update).eq('id', id)
}

export async function getSuggestionStats() {
  const supabase = await createServiceClient()
  const { data } = await supabase
    .from('feature_suggestions')
    .select('status')
    .returns<{ status: string }[]>()

  const suggestions = data ?? []
  return {
    total: suggestions.length,
    new: suggestions.filter(s => s.status === 'new').length,
    under_review: suggestions.filter(s => s.status === 'under_review').length,
    planned: suggestions.filter(s => s.status === 'planned').length,
    in_progress: suggestions.filter(s => s.status === 'in_progress').length,
    implemented: suggestions.filter(s => s.status === 'implemented').length,
    declined: suggestions.filter(s => s.status === 'declined').length,
  }
}
