import { createServiceClient } from '@/lib/supabase/server'
import type { Database } from '@shared/types'

type Domain = Database['public']['Tables']['whitelisted_domains']['Row']
type DomainInsert = Database['public']['Tables']['whitelisted_domains']['Insert']

export async function getAllDomains() {
  const supabase = await createServiceClient()
  const { data } = await supabase
    .from('whitelisted_domains')
    .select('id, domain, plan, notes, active, created_at, created_by')
    .order('created_at', { ascending: false })
    .returns<Domain[]>()
  return data ?? []
}

export async function createDomain(domain: {
  domain: string
  plan: string
  active: boolean
}) {
  const supabase = await createServiceClient()
  const row: DomainInsert = {
    domain: domain.domain,
    plan: domain.plan as Domain['plan'],
    active: domain.active,
  }
  // supabase-js v2.95 resolves Insert type to `never` for hand-crafted Database types
  return (supabase.from('whitelisted_domains') as any).insert(row)
}

export async function updateDomainActive(id: string, active: boolean) {
  const supabase = await createServiceClient()
  return (supabase.from('whitelisted_domains') as any).update({ active }).eq('id', id)
}
