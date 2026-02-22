'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { DollarSign } from 'lucide-react'

interface ProjectItem {
  id: string
  name: string
  color: string
  hourly_rate: number | null
  earnings_enabled: boolean
}

interface Props {
  projects: ProjectItem[]
  currency: string
}

export default function EarningsProjectsManager({ projects: initialProjects, currency }: Props) {
  const router = useRouter()
  const [projects, setProjects] = useState(initialProjects)
  const [toggling, setToggling] = useState<string | null>(null)

  async function handleToggle(id: string, current: boolean) {
    setToggling(id)
    const prev = projects
    setProjects(projects.map(p => p.id === id ? { ...p, earnings_enabled: !current } : p))

    const res = await fetch(`/api/projects/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ earnings_enabled: !current }),
    })
    setToggling(null)

    if (res.ok) {
      router.refresh()
    } else {
      setProjects(prev)
      toast.error('Failed to update project')
    }
  }

  return (
    <div className="rounded-2xl bg-white dark:bg-[var(--dark-card)] border border-stone-100 dark:border-[var(--dark-border)] shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-stone-100 dark:border-[var(--dark-border)]">
        <div className="flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-emerald-500" />
          <h3 className="font-semibold text-stone-800 dark:text-stone-100 text-sm">Manage Project Earnings</h3>
        </div>
        <p className="text-xs text-stone-400 dark:text-stone-500 mt-1">Toggle which projects are included in earnings calculations</p>
      </div>
      <div className="divide-y divide-stone-50 dark:divide-[var(--dark-border)]">
        {projects.map(project => (
          <div key={project.id} className="flex items-center justify-between px-5 py-3">
            <div className="flex items-center gap-3 min-w-0">
              <span
                className="h-3 w-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: project.color }}
              />
              <span className="text-sm text-stone-700 dark:text-stone-200 truncate">{project.name}</span>
              {project.hourly_rate != null && (
                <span className="text-xs text-stone-400 dark:text-stone-500 flex-shrink-0">{currency} {project.hourly_rate}/hr</span>
              )}
            </div>
            <button
              onClick={() => handleToggle(project.id, project.earnings_enabled)}
              disabled={toggling === project.id}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors flex-shrink-0 ${
                project.earnings_enabled
                  ? 'bg-emerald-500'
                  : 'bg-stone-200 dark:bg-stone-700'
              } ${toggling === project.id ? 'opacity-60' : ''}`}
            >
              <span
                className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${
                  project.earnings_enabled ? 'translate-x-4' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
        ))}
        {projects.length === 0 && (
          <div className="px-5 py-6 text-center text-sm text-stone-400 dark:text-stone-500">
            No projects yet
          </div>
        )}
      </div>
    </div>
  )
}
