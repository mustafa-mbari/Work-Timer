'use client'

import Link from 'next/link'
import { ArrowRight, Clock } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import type { TimeEntry } from '@/lib/repositories/timeEntries'
import type { ProjectSummary } from '@/lib/repositories/projects'

interface Props {
  entries: TimeEntry[]
  projects: ProjectSummary[]
  isPremium: boolean
}

function formatDate(date: string): string {
  const [y, m, d] = date.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function formatTime(ms: number): string {
  const d = new Date(ms)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function formatDuration(ms: number): string {
  const totalMin = Math.round(ms / 60000)
  const hours = Math.floor(totalMin / 60)
  const mins = totalMin % 60
  if (hours === 0) return `${mins}m`
  if (mins === 0) return `${hours}h`
  return `${hours}h ${mins}m`
}

export default function RecentTab({ entries, projects, isPremium }: Props) {
  const projectMap = new Map(projects.map(p => [p.id, p]))

  if (!isPremium) {
    return (
      <Card>
        <CardContent className="py-10 flex flex-col items-center gap-3 text-center">
          <Clock className="h-10 w-10 text-stone-300 dark:text-stone-600" />
          <p className="text-sm text-stone-500 dark:text-stone-400">
            Recent entries are available on Premium.
          </p>
          <Button asChild size="sm">
            <Link href="/billing">Upgrade</Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>Recent Entries</CardTitle>
        <Button asChild variant="link" size="sm" className="gap-1 pr-0 text-indigo-500">
          <Link href="/entries">
            View all <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        {entries.length === 0 ? (
          <div className="py-10 flex flex-col items-center gap-2 text-center px-6">
            <Clock className="h-10 w-10 text-stone-300 dark:text-stone-600" />
            <p className="text-sm text-stone-500 dark:text-stone-400">No entries yet.</p>
            <p className="text-xs text-stone-400 dark:text-stone-600">
              Start the timer in the extension to create your first entry.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-stone-100 dark:divide-[var(--dark-border)]">
            {entries.map(entry => {
              const project = entry.project_id ? projectMap.get(entry.project_id) : null
              return (
                <li key={entry.id} className="flex items-center gap-3 px-6 py-3">
                  {/* Date + time */}
                  <div className="w-20 flex-shrink-0">
                    <p className="text-xs font-medium text-stone-700 dark:text-stone-300">
                      {formatDate(entry.date)}
                    </p>
                    <p className="text-xs text-stone-400 dark:text-stone-600 tabular-nums">
                      {formatTime(entry.start_time)}
                    </p>
                  </div>

                  {/* Project dot */}
                  {project ? (
                    <div className="flex items-center gap-1.5 w-24 flex-shrink-0">
                      <span
                        className="h-2 w-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: project.color }}
                      />
                      <span className="text-xs text-stone-600 dark:text-stone-400 truncate">
                        {project.name}
                      </span>
                    </div>
                  ) : (
                    <div className="w-24 flex-shrink-0" />
                  )}

                  {/* Description */}
                  <p className="flex-1 text-sm text-stone-700 dark:text-stone-300 truncate min-w-0">
                    {entry.description || (
                      <span className="text-stone-400 dark:text-stone-600 italic text-xs">No description</span>
                    )}
                  </p>

                  {/* Duration */}
                  <span className="text-xs font-medium text-stone-600 dark:text-stone-400 tabular-nums flex-shrink-0">
                    {formatDuration(entry.duration)}
                  </span>
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
