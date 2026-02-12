import { useState } from 'react'
import type { TimeEntry, Project } from '@/types'
import { formatTime, formatDurationShort } from '@/utils/date'
import EntryEditModal from './EntryEditModal'
import { PlayIcon, LinkIcon } from './Icons'

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
      <div className="text-center text-stone-400 dark:text-stone-600 text-xs py-6">
        No entries yet today
      </div>
    )
  }

  const sorted = [...entries].sort((a, b) => b.startTime - a.startTime)

  return (
    <>
      <div className="flex flex-col gap-1" role="list" aria-label="Today's time entries">
        {sorted.map((entry) => {
          const project = projects.find(p => p.id === entry.projectId)
          return (
            <div
              key={entry.id}
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-white dark:bg-dark-card border border-stone-100 dark:border-dark-border hover:border-stone-200 dark:hover:border-dark-hover transition-colors"
              role="listitem"
            >
              <span
                className="w-1 h-9 rounded-full flex-shrink-0"
                style={{ backgroundColor: project?.color ?? '#D6D3D1' }}
                aria-hidden="true"
              />
              <button
                onClick={() => setEditingEntry(entry)}
                className="flex-1 min-w-0 text-left"
                aria-label={`Edit ${entry.description || 'No description'}, ${formatDurationShort(entry.duration)}`}
              >
                <div className="text-[13px] font-medium text-stone-800 dark:text-stone-200 truncate">
                  {entry.description || <span className="text-stone-400 dark:text-stone-600 italic">No description</span>}
                </div>
                <div className="text-[11px] text-stone-400 dark:text-stone-500 mt-0.5">
                  {formatTime(entry.startTime)} – {formatTime(entry.endTime)}
                  {project && <span className="ml-1.5 text-stone-500 dark:text-stone-400">· {project.name}</span>}
                </div>
              </button>
              <span className="text-xs font-semibold text-stone-500 dark:text-stone-400 flex-shrink-0 tabular-nums">
                {formatDurationShort(entry.duration)}
              </span>
              {entry.link && (
                <button
                  onClick={() => chrome.tabs.create({ url: entry.link! })}
                  className="p-1.5 rounded-lg text-stone-400 hover:text-indigo-500 hover:bg-indigo-50 dark:text-stone-500 dark:hover:text-indigo-400 dark:hover:bg-indigo-500/10 flex-shrink-0 transition-colors"
                  aria-label="Open link"
                  title={entry.link}
                >
                  <LinkIcon className="w-3.5 h-3.5" />
                </button>
              )}
              {onContinue && (
                <button
                  onClick={() => onContinue(entry.id, entry.projectId, entry.description)}
                  className="p-1.5 rounded-lg text-stone-400 hover:text-indigo-500 hover:bg-indigo-50 dark:text-stone-500 dark:hover:text-indigo-400 dark:hover:bg-indigo-500/10 flex-shrink-0 transition-colors"
                  aria-label="Continue timing this task"
                  title="Continue"
                >
                  <PlayIcon className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )
        })}
      </div>

      {editingEntry && (
        <EntryEditModal
          entry={editingEntry}
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
