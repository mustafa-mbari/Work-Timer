import { getAdminUsersPaged } from '@/lib/repositories/admin'
import { getSubscriptionsForUserIds } from '@/lib/repositories/subscriptions'
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
  const search = params.search || ''

  // Fetch only the current page's users from profiles table (server-side filter/sort/page)
  const { users: pagedProfiles, totalCount } = await getAdminUsersPaged(page, PAGE_SIZE, search)

  // Only fetch subscriptions for the current page's user IDs
  const pageUserIds = pagedProfiles.map(u => u.id)
  const subscriptions = await getSubscriptionsForUserIds(pageUserIds)

  const subMap = new Map<string, { plan: string; status: string }>()
  subscriptions.forEach(s => { subMap.set(s.user_id, s) })

  const pagedUsers = pagedProfiles.map(u => {
    const sub = subMap.get(u.id)
    return {
      id: u.id,
      email: u.email || 'Unknown',
      display_name: u.display_name,
      role: u.role || 'user',
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
      search={search}
    />
  )
}
