import { createClient } from '@/lib/supabase/server'
import type { DbSupportTicket } from '@/lib/shared/types'

export type SupportTicketSummary = Pick<
  DbSupportTicket,
  'id' | 'subject' | 'issue_type' | 'priority' | 'status' | 'platform' | 'created_at'
>

export async function getUserTickets(userId: string): Promise<SupportTicketSummary[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('support_tickets')
    .select('id, subject, issue_type, priority, status, platform, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .returns<SupportTicketSummary[]>()
  return data ?? []
}

export async function createSupportTicket(
  userId: string,
  data: {
    user_email: string
    user_name: string | null
    issue_type: string
    subject: string
    description: string
    priority: string
    platform: string
    issue_time: string | null
  },
): Promise<{ data: DbSupportTicket | null; error: { message: string } | null }> {
  const supabase = await createClient()
  const { data: ticket, error } = await (supabase.from('support_tickets') as any)
    .insert({
      user_id: userId,
      user_email: data.user_email,
      user_name: data.user_name,
      issue_type: data.issue_type,
      subject: data.subject,
      description: data.description,
      priority: data.priority,
      platform: data.platform,
      issue_time: data.issue_time,
    })
    .select()
    .single()
  return { data: ticket, error }
}
