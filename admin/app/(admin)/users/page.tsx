import { getAllAuthUsers } from '@/lib/repositories/admin'
import { getSubscriptionsForUserIds } from '@/lib/repositories/subscriptions'
import { getProfilesForUserIds } from '@/lib/repositories/profiles'
import UsersTable from './UsersTable'

export const revalidate = 60

const PAGE_SIZE = 15

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; search?: string }>
}) {
  const params = await searchParams
  const page = Math.max(1, parseInt(params.page || '1', 10) || 1)
  const search = (params.search || '').toLowerCase()

  // Auth users are the source of truth — always fetch all for search + pagination
  const authUsers = await getAllAuthUsers()

  // Sort and filter first (lightweight — only email/metadata)
  let sortedUsers = [...authUsers].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )

  if (search) {
    sortedUsers = sortedUsers.filter(u => (u.email || '').toLowerCase().includes(search))
  }

  const totalCount = sortedUsers.length
  const from = (page - 1) * PAGE_SIZE
  const pagedAuthUsers = sortedUsers.slice(from, from + PAGE_SIZE)

  // Only fetch subscriptions + profiles for the current page's user IDs
  const pageUserIds = pagedAuthUsers.map(u => u.id)
  const [subscriptions, profiles] = await Promise.all([
    getSubscriptionsForUserIds(pageUserIds),
    getProfilesForUserIds(pageUserIds),
  ])

  const subMap = new Map<string, { plan: string; status: string }>()
  subscriptions.forEach(s => { subMap.set(s.user_id, s) })
  const profileMap = new Map<string, { display_name: string | null; role: string }>()
  profiles.forEach(p => { profileMap.set(p.id, p) })

  const pagedUsers = pagedAuthUsers.map(u => {
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
