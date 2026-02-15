import { createServiceClient } from '@/lib/supabase/server'
import UsersTable from './UsersTable'

export const dynamic = 'force-dynamic'

const PAGE_SIZE = 15

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; search?: string }>
}) {
  const params = await searchParams
  const page = Math.max(1, parseInt(params.page || '1', 10) || 1)
  const search = (params.search || '').toLowerCase()

  const supabase = await createServiceClient()

  // Use auth.admin for the full user list (profiles table may be incomplete)
  const [
    { data: { users: authUsers } },
    { data: subscriptions },
    { data: profiles },
  ] = await Promise.all([
    supabase.auth.admin.listUsers({ perPage: 10000 }),
    (supabase.from('subscriptions') as any).select('user_id, plan, status'),
    (supabase.from('profiles') as any).select('id, display_name, role'),
  ])

  // Build lookup maps
  const subMap = new Map<string, { plan: string; status: string }>()
  subscriptions?.forEach((s: any) => { subMap.set(s.user_id, s) })
  const profileMap = new Map<string, { display_name: string | null; role: string }>()
  profiles?.forEach((p: any) => { profileMap.set(p.id, p) })

  // Merge auth users with profile + subscription data
  let mergedUsers = (authUsers || []).map((u: any) => {
    const profile = profileMap.get(u.id)
    const sub = subMap.get(u.id)
    return {
      id: u.id,
      email: u.email || 'Unknown',
      display_name: profile?.display_name || u.user_metadata?.full_name || u.user_metadata?.name || null,
      role: profile?.role || 'user',
      created_at: u.created_at,
      subscriptions: sub || { plan: 'free', status: 'active' },
    }
  })

  // Sort by created_at descending
  mergedUsers.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  // Apply search filter
  if (search) {
    mergedUsers = mergedUsers.filter(u => u.email.toLowerCase().includes(search))
  }

  const totalCount = mergedUsers.length

  // Apply pagination
  const from = (page - 1) * PAGE_SIZE
  const pagedUsers = mergedUsers.slice(from, from + PAGE_SIZE)

  return (
    <UsersTable
      users={pagedUsers}
      totalCount={totalCount}
      page={page}
      pageSize={PAGE_SIZE}
      search={params.search || ''}
    />
  )
}
