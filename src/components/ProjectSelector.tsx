import type { Project } from '@/types'

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
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
        aria-label="Select project"
      >
        <option value="">No Project</option>
        {projects.map((project) => (
          <option key={project.id} value={project.id}>
            {project.name}
          </option>
        ))}
      </select>
      {selectedId && (
        <span
          className="absolute left-2 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full pointer-events-none"
          style={{ backgroundColor: projects.find(p => p.id === selectedId)?.color ?? '#gray' }}
          aria-hidden="true"
        />
      )}
      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none text-xs" aria-hidden="true">
        ▼
      </span>
    </div>
  )
}
