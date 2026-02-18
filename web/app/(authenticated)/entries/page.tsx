import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/services/auth'
import { isPremiumUser } from '@/lib/services/billing'
import { getUserTimeEntries } from '@/lib/repositories/timeEntries'
import { getUserProjects } from '@/lib/repositories/projects'
import EntriesView from './EntriesView'

interface Props {
  searchParams: Promise<{
    page?: string
    dateFrom?: string
    dateTo?: string
    projectId?: string
    type?: string
  }>
}

export default async function EntriesPage({ searchParams }: Props) {
  const user = await requireAuth()
  if (!(await isPremiumUser(user.id))) redirect('/billing')

  const sp = await searchParams
  const page = Math.max(1, parseInt(sp.page ?? '1', 10) || 1)
  const filters = {
    dateFrom: sp.dateFrom,
    dateTo: sp.dateTo,
    projectId: sp.projectId,
    type: sp.type,
    page,
    pageSize: 25,
  }

  const [entriesPage, projects] = await Promise.all([
    getUserTimeEntries(user.id, filters),
    getUserProjects(user.id),
  ])

  return (
    <div className="max-w-5xl mx-auto px-6 py-8 animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-stone-900 dark:text-stone-100">Time Entries</h1>
        <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
          {entriesPage.total} {entriesPage.total === 1 ? 'entry' : 'entries'} total
        </p>
      </div>

      <EntriesView
        entriesPage={entriesPage}
        projects={projects}
        filters={filters}
      />
    </div>
  )
}
