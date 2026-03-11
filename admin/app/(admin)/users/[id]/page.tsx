import { notFound } from 'next/navigation'
import { requireAdmin } from '@/lib/services/auth'
import { getUserDetails } from '@/lib/repositories/admin'
import UserDetailView from './UserDetailView'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await requireAdmin()
  const { id } = await params

  let details
  try {
    details = await getUserDetails(id)
  } catch {
    notFound()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Link
          href="/users"
          className="flex items-center gap-1 text-sm text-stone-500 hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-200 transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Users
        </Link>
      </div>
      <UserDetailView details={details} userId={id} />
    </div>
  )
}
