import { useState, useRef, useEffect } from 'react'
import type { Project } from '@/types'
import { ChevronDownIcon } from './Icons'

interface ProjectSelectorProps {
  projects: Project[]
  selectedId: string | null
  onChange: (id: string | null) => void
  disabled?: boolean
}

export default function ProjectSelector({ projects, selectedId, onChange, disabled }: ProjectSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const selectedProject = projects.find(p => p.id === selectedId)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // Close on ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false)
    }
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown)
      return () => window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  const handleSelect = (id: string | null) => {
    onChange(id)
    setIsOpen(false)
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className="w-full border border-stone-200 dark:border-dark-border rounded-xl pl-9 pr-9 py-2.5 text-sm bg-white dark:bg-dark-card text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 dark:focus:ring-indigo-400/40 dark:focus:border-indigo-400 disabled:opacity-50 text-left"
        aria-label="Select project"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        {selectedProject?.name || 'No Project'}
      </button>

      {/* Color indicator for selected project */}
      <span
        className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full pointer-events-none"
        style={{
          backgroundColor: selectedProject?.color ?? '#A8A29E',
          border: selectedProject ? 'none' : '1px solid currentColor',
          color: selectedProject ? 'transparent' : 'rgb(168 162 158)'
        }}
        aria-hidden="true"
      />

      {/* Chevron icon */}
      <ChevronDownIcon
        className={`absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 dark:text-stone-500 pointer-events-none transition-transform ${isOpen ? 'rotate-180' : ''}`}
      />

      {/* Dropdown menu */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-dark-elevated border border-stone-200 dark:border-dark-border rounded-xl shadow-lg max-h-60 overflow-auto">
          {/* No Project option */}
          <button
            type="button"
            onClick={() => handleSelect(null)}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-left hover:bg-stone-50 dark:hover:bg-dark-hover transition-colors ${
              !selectedId ? 'bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400' : 'text-stone-900 dark:text-stone-100'
            }`}
          >
            <span className="w-3 h-3 rounded-full border border-stone-300 dark:border-stone-600 bg-transparent" />
            <span>No Project</span>
          </button>

          {/* Project options */}
          {projects.map((project) => (
            <button
              key={project.id}
              type="button"
              onClick={() => handleSelect(project.id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-left hover:bg-stone-50 dark:hover:bg-dark-hover transition-colors ${
                selectedId === project.id ? 'bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400' : 'text-stone-900 dark:text-stone-100'
              }`}
            >
              <span
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: project.color }}
              />
              <span className="truncate">{project.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
