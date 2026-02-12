import { useState } from 'react'
import type { TimeEntry, Project } from '@/types'
import { formatTime, formatDurationShort } from '@/utils/date'
import EntryEditModal from './EntryEditModal'

interface EntryListProps {
  entries: TimeEntry[]
  projects: Project[]
  onUpdate: (entry: TimeEntry) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onContinue?: (entryId: string, projectId: string | null, description: string) => void
}

export default function EntryList({ entries, projects, onUpdate, onDelete, onContinue }: EntryListProps) {
  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null)

  if (entries.length === 0) {
    return (
      <div className="text-center text-gray-400 text-xs py-4">
        No entries yet today
      </div>
    )
  }

  const sorted = [...entries].sort((a, b) => b.startTime - a.startTime)

  return (
    <>
      <div className="flex flex-col gap-1.5" role="list" aria-label="Today's time entries">
        {sorted.map((entry) => {
          const project = projects.find(p => p.id === entry.projectId)
          return (
            <div
              key={entry.id}
              className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 transition-colors"
              role="listitem"
            >
              <span
                className="w-1 h-8 rounded-full flex-shrink-0"
                style={{ backgroundColor: project?.color ?? '#d1d5db' }}
                aria-hidden="true"
              />
              <button
                onClick={() => setEditingEntry(entry)}
                className="flex-1 min-w-0 text-left"
                aria-label={`Edit ${entry.description || 'No description'}, ${formatDurationShort(entry.duration)}`}
              >
                <div className="text-sm font-medium text-gray-800 truncate">
                  {entry.description || <span className="text-gray-400 italic">No description</span>}
                </div>
                <div className="text-xs text-gray-400">
                  {formatTime(entry.startTime)} – {formatTime(entry.endTime)}
                  {project && <span className="ml-1.5">· {project.name}</span>}
                </div>
              </button>
              <span className="text-xs font-medium text-gray-600 flex-shrink-0">
                {formatDurationShort(entry.duration)}
              </span>
              {onContinue && (
                <button
                  onClick={() => onContinue(entry.id, entry.projectId, entry.description)}
                  className="p-1.5 rounded-md hover:bg-blue-50 text-blue-600 flex-shrink-0 transition-colors"
                  aria-label="Continue timing this task"
                  title="Continue"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                    <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                  </svg>
                </button>
              )}
            </div>
          )
        })}
      </div>

      {editingEntry && (
        <EntryEditModal
          entry={editingEntry}
          projects={projects}
          onSave={async (updated) => {
            await onUpdate(updated)
            setEditingEntry(null)
          }}
          onDelete={async () => {
            await onDelete(editingEntry.id)
            setEditingEntry(null)
          }}
          onClose={() => setEditingEntry(null)}
        />
      )}
    </>
  )
}
