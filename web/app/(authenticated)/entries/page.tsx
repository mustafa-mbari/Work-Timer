import { Suspense } from 'react'
import { Lock } from 'lucide-react'
import { requireAuth } from '@/lib/services/auth'
import { isPremiumUser } from '@/lib/services/billing'
import { getUserTimeEntries } from '@/lib/repositories/timeEntries'
import { getUserProjects } from '@/lib/repositories/projects'
import { getUserTags } from '@/lib/repositories/tags'
import EntriesView from './EntriesView'

const PREVIEW_ENTRIES = [
  { date: 'Today',      time: '09:00 – 11:30', duration: '2h 30m', project: 'Frontend',  description: 'Implement dashboard components',  type: 'Stopwatch' },
  { date: 'Today',      time: '13:00 – 13:45', duration: '0h 45m', project: 'Meetings',  description: 'Daily standup & sprint planning',  type: 'Manual'    },
  { date: 'Yesterday',  time: '10:15 – 11:30', duration: '1h 15m', project: 'Design',    description: 'UI review and design feedback',    type: 'Manual'    },
  { date: 'Yesterday',  time: '14:00 – 17:00', duration: '3h 00m', project: 'Backend',   description: 'Fix authentication bug',           type: 'Stopwatch' },
  { date: '2 days ago', time: '09:30 – 11:00', duration: '1h 30m', project: 'Frontend',  description: 'Write unit tests for API layer',   type: 'Stopwatch' },
  { date: '2 days ago', time: '15:00 – 15:30', duration: '0h 30m', project: 'Meetings',  description: 'Team retrospective',               type: 'Pomodoro'  },
  { date: '3 days ago', time: '10:00 – 11:45', duration: '1h 45m', project: 'Backend',   description: 'Database schema migration',        type: 'Stopwatch' },
  { date: '3 days ago', time: '13:30 – 17:30', duration: '4h 00m', project: 'Frontend',  description: 'Refactor state management layer',  type: 'Stopwatch' },
]

const PROJECT_COLORS: Record<string, string> = {
  Frontend: '#6366f1', Backend: '#10b981', Design: '#f59e0b', Meetings: '#ef4444',
}

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
  const premium = await isPremiumUser(user.id)

  if (!premium) {
    return (
      <div className="animate-fade-in">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-stone-900 dark:text-stone-100">Time Entries</h1>
          <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">Full history across all your projects</p>
        </div>

        <div className="relative">
          {/* Blurred fake table */}
          <div className="blur-[2px] pointer-events-none select-none opacity-60">
            {/* Filter bar placeholder */}
            <div className="flex items-center gap-3 mb-4">
              <div className="h-9 w-36 rounded-lg bg-stone-100 dark:bg-[var(--dark-elevated)]" />
              <div className="h-9 w-28 rounded-lg bg-stone-100 dark:bg-[var(--dark-elevated)]" />
              <div className="h-9 w-28 rounded-lg bg-stone-100 dark:bg-[var(--dark-elevated)]" />
              <div className="ml-auto h-9 w-28 rounded-lg bg-indigo-100 dark:bg-indigo-900/30" />
            </div>

            {/* Table */}
            <div className="rounded-xl border border-stone-200 dark:border-[var(--dark-border)] overflow-hidden bg-white dark:bg-[var(--dark-card)]">
              {/* Header */}
              <div className="grid grid-cols-[1fr_1fr_1fr_1.5fr_2fr_1fr] gap-4 px-4 py-3 bg-stone-50 dark:bg-[var(--dark-elevated)] text-xs font-medium text-stone-500 dark:text-stone-400 border-b border-stone-200 dark:border-[var(--dark-border)]">
                <span>Date</span><span>Time</span><span>Duration</span><span>Project</span><span>Description</span><span>Type</span>
              </div>
              {/* Rows */}
              {PREVIEW_ENTRIES.map((e, i) => (
                <div key={i} className="grid grid-cols-[1fr_1fr_1fr_1.5fr_2fr_1fr] gap-4 px-4 py-3 text-sm border-b border-stone-100 dark:border-[var(--dark-border)] last:border-0 items-center">
                  <span className="text-stone-500 dark:text-stone-400 text-xs">{e.date}</span>
                  <span className="text-stone-500 dark:text-stone-400 text-xs font-mono">{e.time}</span>
                  <span className="font-medium text-stone-800 dark:text-stone-200">{e.duration}</span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: PROJECT_COLORS[e.project] ?? '#6366f1' }} />
                    <span className="text-stone-700 dark:text-stone-300 truncate">{e.project}</span>
                  </span>
                  <span className="text-stone-600 dark:text-stone-400 truncate">{e.description}</span>
                  <span className="text-xs text-stone-400 dark:text-stone-500">{e.type}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Upgrade overlay */}
          <div className="absolute inset-x-0 top-16 flex justify-center z-10 px-4">
            <div className="bg-white/95 dark:bg-[var(--dark-card)]/95 backdrop-blur-sm rounded-2xl shadow-2xl border border-stone-200 dark:border-[var(--dark-border)] p-8 text-center max-w-md w-full">
              <div className="w-14 h-14 rounded-2xl bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center mx-auto mb-4">
                <Lock className="h-7 w-7 text-indigo-500 dark:text-indigo-400" />
              </div>
              <h2 className="text-xl font-bold text-stone-900 dark:text-stone-100 mb-2">Unlock Full History</h2>
              <p className="text-sm text-stone-500 dark:text-stone-400 mb-6">
                Browse, filter, edit and export all your time entries with Premium. Free plan shows only the last 30 days in the extension.
              </p>
              <a
                href="/billing"
                className="inline-block w-full px-5 py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-semibold transition-colors"
              >
                Upgrade to Premium
              </a>
              <p className="text-xs text-stone-400 dark:text-stone-500 mt-3">Starting at $1.99 / month</p>
            </div>
          </div>

          {/* Fade-out at bottom */}
          <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-white dark:from-[var(--dark)] to-transparent pointer-events-none" />
        </div>
      </div>
    )
  }

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

  const [entriesPage, projects, tags] = await Promise.all([
    getUserTimeEntries(user.id, filters),
    getUserProjects(user.id),
    getUserTags(user.id),
  ])

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-stone-900 dark:text-stone-100">Time Entries</h1>
        <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
          {entriesPage.total} {entriesPage.total === 1 ? 'entry' : 'entries'} total
        </p>
      </div>

      <Suspense fallback={<div className="h-64" />}>
        <EntriesView
          entriesPage={entriesPage}
          projects={projects}
          tags={tags}
          filters={filters}
        />
      </Suspense>
    </div>
  )
}
