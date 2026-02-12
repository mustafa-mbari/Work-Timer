import { useState } from 'react'
import type { TimeEntry, Project } from '@/types'
import { XIcon } from './Icons'

interface EntryEditModalProps {
  entry: TimeEntry
  projects: Project[]
  onSave: (entry: TimeEntry) => Promise<void>
  onDelete: () => Promise<void>
  onClose: () => void
}

type EditMode = 'range' | 'duration'

function timestampToTimeString(ts: number): string {
  const d = new Date(ts)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`
}

function timeStringToTimestamp(time: string, referenceTs: number): number {
  const parts = time.split(':').map(Number)
  const [h, m] = parts
  const s = parts[2] ?? 0
  const d = new Date(referenceTs)
  d.setHours(h, m, s, 0)
  return d.getTime()
}

function msToDurationParts(ms: number): { h: number; m: number; s: number } {
  const totalSeconds = Math.floor(ms / 1000)
  return {
    h: Math.floor(totalSeconds / 3600),
    m: Math.floor((totalSeconds % 3600) / 60),
    s: totalSeconds % 60,
  }
}

export default function EntryEditModal({ entry, projects, onSave, onDelete, onClose }: EntryEditModalProps) {
  const [mode, setMode] = useState<EditMode>('range')
  const [from, setFrom] = useState(timestampToTimeString(entry.startTime))
  const [to, setTo] = useState(timestampToTimeString(entry.endTime))
  const initDur = msToDurationParts(entry.duration)
  const [durH, setDurH] = useState(String(initDur.h))
  const [durM, setDurM] = useState(String(initDur.m))
  const [durS, setDurS] = useState(String(initDur.s))
  const [projectId, setProjectId] = useState(entry.projectId ?? '')
  const [description, setDescription] = useState(entry.description)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const handleSave = async () => {
    if (mode === 'range') {
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
    } else {
      const h = parseInt(durH) || 0
      const m = parseInt(durM) || 0
      const s = parseInt(durS) || 0
      const duration = (h * 3600 + m * 60 + s) * 1000
      if (duration <= 0) return

      await onSave({
        ...entry,
        duration,
        endTime: entry.startTime + duration,
        projectId: projectId || null,
        description,
      })
    }
  }

  const inputClass = "w-full border border-stone-200 dark:border-dark-border bg-white dark:bg-dark-elevated text-stone-900 dark:text-stone-100 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 dark:focus:ring-indigo-400/40 dark:focus:border-indigo-400"
  const labelClass = "text-[11px] font-medium text-stone-500 dark:text-stone-400 block mb-1.5"

  return (
    <div
      className="fixed inset-0 bg-black/30 dark:bg-black/50 flex items-end justify-center z-50 backdrop-blur-[2px]"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Edit time entry"
    >
      <div
        className="bg-white dark:bg-dark-elevated rounded-t-2xl w-full max-w-[380px] p-5 flex flex-col gap-4 animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center">
          <h2 className="font-semibold text-sm text-stone-900 dark:text-stone-100">Edit Entry</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-stone-400 dark:text-stone-500 hover:text-stone-600 dark:hover:text-stone-300 hover:bg-stone-100 dark:hover:bg-dark-elevated transition-colors"
            aria-label="Close"
          >
            <XIcon className="w-4 h-4" />
          </button>
        </div>

        <div className="flex gap-1 bg-stone-100 dark:bg-dark-hover rounded-lg p-0.5">
          <button
            onClick={() => setMode('range')}
            className={`flex-1 text-xs font-medium py-1.5 rounded-md transition-colors ${mode === 'range' ? 'bg-white dark:bg-dark-card text-stone-900 dark:text-stone-100 shadow-sm' : 'text-stone-500 dark:text-stone-400'}`}
          >
            From / To
          </button>
          <button
            onClick={() => setMode('duration')}
            className={`flex-1 text-xs font-medium py-1.5 rounded-md transition-colors ${mode === 'duration' ? 'bg-white dark:bg-dark-card text-stone-900 dark:text-stone-100 shadow-sm' : 'text-stone-500 dark:text-stone-400'}`}
          >
            Duration
          </button>
        </div>

        {mode === 'range' ? (
          <div className="flex gap-3">
            <div className="flex-1">
              <label htmlFor="edit-from" className={labelClass}>From</label>
              <input id="edit-from" type="time" step="1" value={from} onChange={(e) => setFrom(e.target.value)} className={inputClass} />
            </div>
            <div className="flex-1">
              <label htmlFor="edit-to" className={labelClass}>To</label>
              <input id="edit-to" type="time" step="1" value={to} onChange={(e) => setTo(e.target.value)} className={inputClass} />
            </div>
          </div>
        ) : (
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <label htmlFor="edit-dur-h" className={labelClass}>Hours</label>
              <input id="edit-dur-h" type="number" min="0" max="23" value={durH} onChange={(e) => setDurH(e.target.value)} className={`${inputClass} text-center tabular-nums`} />
            </div>
            <span className="text-stone-400 dark:text-stone-500 font-bold pb-2.5">:</span>
            <div className="flex-1">
              <label htmlFor="edit-dur-m" className={labelClass}>Min</label>
              <input id="edit-dur-m" type="number" min="0" max="59" value={durM} onChange={(e) => setDurM(e.target.value)} className={`${inputClass} text-center tabular-nums`} />
            </div>
            <span className="text-stone-400 dark:text-stone-500 font-bold pb-2.5">:</span>
            <div className="flex-1">
              <label htmlFor="edit-dur-s" className={labelClass}>Sec</label>
              <input id="edit-dur-s" type="number" min="0" max="59" value={durS} onChange={(e) => setDurS(e.target.value)} className={`${inputClass} text-center tabular-nums`} />
            </div>
          </div>
        )}

        <div>
          <label htmlFor="edit-project" className={labelClass}>Project</label>
          <select
            id="edit-project"
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            className={`${inputClass} appearance-none`}
          >
            <option value="">No Project</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="edit-description" className={labelClass}>Description</label>
          <input
            id="edit-description"
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={inputClass}
          />
        </div>

        <div className="flex gap-2.5 pt-1">
          {confirmDelete ? (
            <>
              <button
                onClick={onDelete}
                className="flex-1 bg-rose-500 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-rose-600 transition-colors"
                aria-label="Confirm delete"
              >
                Confirm Delete
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="flex-1 border border-stone-200 dark:border-dark-border py-2.5 rounded-xl text-sm font-medium text-stone-600 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-dark-elevated transition-colors"
              >
                Cancel
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setConfirmDelete(true)}
                className="px-4 border border-rose-200 dark:border-rose-700/40 text-rose-500 dark:text-rose-400 py-2.5 rounded-xl text-sm font-medium hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
                aria-label="Delete entry"
              >
                Delete
              </button>
              <button
                onClick={handleSave}
                className="flex-1 bg-indigo-500 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-indigo-600 transition-colors shadow-sm shadow-indigo-500/20"
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
