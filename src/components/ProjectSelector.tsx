import type { Project } from '@/types'
import { ChevronDownIcon } from './Icons'

interface ProjectSelectorProps {
  projects: Project[]
  selectedId: string | null
  onChange: (id: string | null) => void
  disabled?: boolean
}

export default function ProjectSelector({ projects, selectedId, onChange, disabled }: ProjectSelectorProps) {
  return (
    <div className="relative">
      <select
        value={selectedId ?? ''}
        onChange={(e) => onChange(e.target.value || null)}
        disabled={disabled}
        className="w-full border border-stone-200 dark:border-dark-border rounded-xl pl-9 pr-9 py-2.5 text-sm bg-white dark:bg-dark-card text-stone-900 dark:text-stone-100 appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 dark:focus:ring-indigo-400/40 dark:focus:border-indigo-400 disabled:opacity-50"
        aria-label="Select project"
      >
        <option value="">No Project</option>
        {projects.map((project) => (
          <option key={project.id} value={project.id}>
            {project.name}
          </option>
        ))}
      </select>
      <span
        className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full pointer-events-none border border-stone-200 dark:border-dark-border"
        style={selectedId ? { backgroundColor: projects.find(p => p.id === selectedId)?.color ?? '#A8A29E', borderColor: 'transparent' } : undefined}
        aria-hidden="true"
      />
      <ChevronDownIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 dark:text-stone-500 pointer-events-none" />
    </div>
  )
}
