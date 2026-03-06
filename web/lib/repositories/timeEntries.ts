import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/shared/types'

type TimeEntry = Database['public']['Tables']['time_entries']['Row']

export type { TimeEntry }

export interface TimeEntryFilters {
  dateFrom?: string
  dateTo?: string
  projectId?: string
  type?: string
  page?: number
  pageSize?: number
}

export interface TimeEntryPage {
  data: TimeEntry[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export async function getUserTimeEntries(
  userId: string,
  filters: TimeEntryFilters = {}
): Promise<TimeEntryPage> {
  const supabase = await createClient()
  const page = filters.page ?? 1
  const pageSize = filters.pageSize ?? 50
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  let query = supabase
    .from('time_entries')
    .select('*', { count: 'exact' })
    .eq('user_id', userId)
    .is('deleted_at', null)
    .order('start_time', { ascending: false })
    .range(from, to)

  if (filters.dateFrom) query = query.gte('date', filters.dateFrom)
  if (filters.dateTo) query = query.lte('date', filters.dateTo)
  if (filters.projectId) query = query.eq('project_id', filters.projectId)
  if (filters.type) query = query.eq('type', filters.type as TimeEntry['type'])

  const { data, count } = await query.returns<TimeEntry[]>()
  const total = count ?? 0

  return {
    data: data ?? [],
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  }
}

export async function getTodayTotalDuration(userId: string): Promise<number> {
  const supabase = await createClient()
  const now = new Date()
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

  const { data, error } = await (supabase.rpc as Function)(
    'get_today_total_duration',
    { p_user_id: userId, p_date: today }
  )

  if (error) {
    console.error('[timeEntries] get_today_total_duration RPC failed:', error.message)
    return 0
  }

  return Number(data) || 0
}

export async function getUserTimeEntryById(userId: string, entryId: string) {
  const supabase = await createClient()
  return supabase
    .from('time_entries')
    .select('*')
    .eq('id', entryId)
    .eq('user_id', userId)
    .is('deleted_at', null)
    .single<TimeEntry>()
}

export async function createTimeEntry(
  userId: string,
  entry: {
    id: string
    date: string
    start_time: number
    end_time: number
    duration: number
    type: TimeEntry['type']
    project_id?: string | null
    task_id?: string | null
    description?: string
    tags?: string[]
    link?: string | null
  }
) {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (supabase.from('time_entries') as any).insert({
    ...entry,
    user_id: userId,
    description: entry.description ?? '',
    tags: entry.tags ?? [],
  })
}

export async function updateTimeEntry(
  userId: string,
  entryId: string,
  updates: Partial<{
    date: string
    start_time: number
    end_time: number
    duration: number
    type: TimeEntry['type']
    project_id: string | null
    task_id: string | null
    description: string
    tags: string[]
    link: string | null
  }>
) {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (supabase.from('time_entries') as any)
    .update(updates)
    .eq('id', entryId)
    .eq('user_id', userId)
    .is('deleted_at', null)
}

export async function deleteTimeEntries(userId: string, ids: string[]) {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (supabase.from('time_entries') as any)
    .update({
      deleted_at: new Date().toISOString(),
    })
    .in('id', ids)
    .eq('user_id', userId)
}
