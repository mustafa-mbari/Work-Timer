import { createServiceClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/shared/types'

type SupportTicket = Database['public']['Tables']['support_tickets']['Row']

export async function getAllTickets(filters?: { status?: string; priority?: string }) {
  const supabase = await createServiceClient()
  let query = supabase
    .from('support_tickets')
    .select('id, user_id, user_email, user_name, issue_type, subject, description, priority, platform, issue_time, status, admin_notes, resolved_at, resolved_by, created_at, updated_at')
    .order('created_at', { ascending: false })

  if (filters?.status) {
    query = query.eq('status', filters.status)
  }
  if (filters?.priority) {
    query = query.eq('priority', filters.priority)
  }

  const { data } = await query
  return (data ?? []) as SupportTicket[]
}

export async function getTicketById(id: string) {
  const supabase = await createServiceClient()
  const { data } = await supabase
    .from('support_tickets')
    .select('*')
    .eq('id', id)
    .single<SupportTicket>()
  return data
}

export async function updateTicketStatus(id: string, status: string, adminNotes?: string | null) {
  const supabase = await createServiceClient()
  const update: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
  }
  if (adminNotes !== undefined) {
    update.admin_notes = adminNotes
  }
  if (status === 'resolved' || status === 'closed') {
    update.resolved_at = new Date().toISOString()
  }
  return supabase.from('support_tickets').update(update).eq('id', id)
}

export async function getTicketStats() {
  const supabase = await createServiceClient()
  const { data } = await supabase
    .from('support_tickets')
    .select('status')
    .returns<{ status: string }[]>()

  const tickets = data ?? []
  return {
    total: tickets.length,
    open: tickets.filter(t => t.status === 'open').length,
    in_progress: tickets.filter(t => t.status === 'in_progress').length,
    resolved: tickets.filter(t => t.status === 'resolved').length,
    closed: tickets.filter(t => t.status === 'closed').length,
  }
}
