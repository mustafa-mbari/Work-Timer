import { requireAdmin } from '@/lib/services/auth'
import { getAdminGroups } from '@/lib/repositories/admin'
import AdminGroupsView from './AdminGroupsView'

export const revalidate = 60

export default async function AdminGroupsPage() {
  await requireAdmin()
  const groups = await getAdminGroups()
  return <AdminGroupsView initialGroups={groups} />
}
