import { useState } from 'react'
import type { TimeEntry, Project } from '@/types'

interface EntryEditModalProps {
  entry: TimeEntry
  projects: Project[]
  onSave: (entry: TimeEntry) => Promise<void>
  onDelete: () => Promise<void>
  onClose: () => void
}

function timestampToTimeString(ts: number): string {
  const d = new Date(ts)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function timeStringToTimestamp(time: string, referenceTs: number): number {
  const [h, m] = time.split(':').map(Number)
  const d = new Date(referenceTs)
  d.setHours(h, m, 0, 0)
  return d.getTime()
}

export default function EntryEditModal({ entry, projects, onSave, onDelete, onClose }: EntryEditModalProps) {
  const [from, setFrom] = useState(timestampToTimeString(entry.startTime))
  const [to, setTo] = useState(timestampToTimeString(entry.endTime))
  const [projectId, setProjectId] = useState(entry.projectId ?? '')
  const [description, setDescription] = useState(entry.description)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const handleSave = async () => {
    const startTime = timeStringToTimestamp(from, entry.startTime)
    const endTime = timeStringToTimestamp(to, entry.endTime)
    if (endTime <= startTime) return

    await onSave({
      ...entry,
      startTime,
      endTime,
      duration: endTime - startTime,
      projectId: projectId || null,
      description,
    })
  }

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-end justify-center z-50"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Edit time entry"
    >
      <div
        className="bg-white rounded-t-xl w-full max-w-[380px] p-4 flex flex-col gap-3"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center">
          <h2 className="font-semibold text-sm text-gray-800">Edit Entry</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-lg leading-none"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="flex gap-2">
          <div className="flex-1">
            <label htmlFor="edit-from" className="text-xs text-gray-500 block mb-1">From</label>
            <input
              id="edit-from"
              type="time"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex-1">
            <label htmlFor="edit-to" className="text-xs text-gray-500 block mb-1">To</label>
            <input
              id="edit-to"
              type="time"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div>
          <label htmlFor="edit-project" className="text-xs text-gray-500 block mb-1">Project</label>
          <select
            id="edit-project"
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">No Project</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="edit-description" className="text-xs text-gray-500 block mb-1">Description</label>
          <input
            id="edit-description"
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex gap-2 pt-1">
          {confirmDelete ? (
            <>
              <button
                onClick={onDelete}
                className="flex-1 bg-red-500 text-white py-2 rounded-lg text-sm font-medium hover:bg-red-600"
                aria-label="Confirm delete"
              >
                Confirm Delete
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="flex-1 border border-gray-300 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setConfirmDelete(true)}
                className="px-4 border border-red-300 text-red-500 py-2 rounded-lg text-sm hover:bg-red-50"
                aria-label="Delete entry"
              >
                Delete
              </button>
              <button
                onClick={handleSave}
                className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
                aria-label="Save changes"
              >
                Save
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
