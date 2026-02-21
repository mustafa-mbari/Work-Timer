import { requireAuth } from '@/lib/services/auth'
import { createClient } from '@/lib/supabase/server'
import { getAdminGroups } from '@/lib/repositories/admin'
import AdminGroupsView from './AdminGroupsView'

export const revalidate = 60

export default async function AdminGroupsPage() {
  const user = await requireAuth()
  const supabase = await createClient()

  // Verify admin
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase.from('profiles') as any)
    .select('role')
    .eq('id', user.id)
    .single()

  if (data?.role !== 'admin') {
    return <p className="text-stone-500">Access denied</p>
  }

  const groups = await getAdminGroups()

  return <AdminGroupsView initialGroups={groups} />
}
