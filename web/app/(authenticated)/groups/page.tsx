import Link from 'next/link'
import { Users, Zap } from 'lucide-react'
import { requireAuth } from '@/lib/services/auth'
import { isAllInUser } from '@/lib/services/groups'
import { getUserGroups } from '@/lib/repositories/groups'
import { getUserPendingInvitations } from '@/lib/repositories/groupInvitations'
import { getUserProjects } from '@/lib/repositories/projects'
import { getUserTags } from '@/lib/repositories/tags'
import { Button } from '@/components/ui/button'
import GroupsView from './GroupsView'

export default async function GroupsPage() {
  const user = await requireAuth()
  const allIn = await isAllInUser(user.id)

  if (!allIn) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="rounded-2xl bg-white dark:bg-[var(--dark-card)] border border-stone-100 dark:border-[var(--dark-border)] shadow-sm p-10 flex flex-col items-center gap-4 text-center">
          <div className="h-16 w-16 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center">
            <Users className="h-8 w-8 text-indigo-400" />
          </div>
          <h2 className="text-xl font-bold text-stone-800 dark:text-stone-100">
            Team Groups
          </h2>
          <p className="text-sm text-stone-500 dark:text-stone-400 max-w-md">
            Create groups, invite team members, and share time tracking data.
            Groups are available with the All-In subscription plan.
          </p>
          <Button asChild className="mt-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl gap-2">
            <Link href="/billing">
              <Zap className="h-4 w-4" />
              Upgrade to All-In
            </Link>
          </Button>
        </div>
      </div>
    )
  }

  const [groups, invitations, allProjects, allTags] = await Promise.all([
    getUserGroups(user.id),
    getUserPendingInvitations(user.email ?? ''),
    getUserProjects(user.id),
    getUserTags(user.id),
  ])

  const projects = allProjects
    .filter(p => !p.archived)
    .map(p => ({ id: p.id, name: p.name, color: p.color }))

  const tags = allTags.map(t => ({ id: t.id, name: t.name, color: t.color ?? '#6366F1' }))

  return <GroupsView initialGroups={groups} initialInvitations={invitations} projects={projects} tags={tags} />
}
