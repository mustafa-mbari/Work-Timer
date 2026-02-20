import { requireAuth } from '@/lib/services/auth'
import { getUserSubscription } from '@/lib/repositories/subscriptions'
import { getUserSyncCursors } from '@/lib/repositories/syncCursors'
import { getUserTimeEntries } from '@/lib/repositories/timeEntries'
import { getUserProjects } from '@/lib/repositories/projects'
import { getUserTags } from '@/lib/repositories/tags'
import { getUserStats } from '@/lib/repositories/userStats'
import DashboardTabs from './DashboardTabs'

export default async function DashboardPage() {
  const user = await requireAuth()

  const [{ data: subscription }, cursors, entriesPage, projects, tags, stats] = await Promise.all([
    getUserSubscription(user.id),
    getUserSyncCursors(user.id),
    getUserTimeEntries(user.id, { pageSize: 10 }),
    getUserProjects(user.id),
    getUserTags(user.id),
    getUserStats(user.id),
  ])

  const isPremium = subscription?.plan !== 'free' && subscription?.status === 'active'

  return (
    <DashboardTabs
      subscription={subscription}
      cursors={cursors ?? []}
      recentEntries={entriesPage.data}
      projects={projects}
      tags={tags}
      stats={stats}
      isPremium={isPremium}
      userEmail={user.email ?? ''}
    />
  )
}
