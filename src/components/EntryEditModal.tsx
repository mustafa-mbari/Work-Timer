import { useState, useEffect } from 'react'
import type { TimeEntry } from '@/types'
import { XIcon, PlusIcon } from './Icons'
import { useProjects } from '@/hooks/useProjects'
import { useTags } from '@/hooks/useTags'
import { PROJECT_COLORS } from '@/constants/colors'
import { inputClassElevated as inputClass, labelClass, addInputClassElevated as addInputClass } from '@/constants/styles'

interface EntryEditModalProps {
  entry: TimeEntry
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

export default function EntryEditModal({ entry, onSave, onDelete, onClose }: EntryEditModalProps) {
  const { activeProjects, create: createProject } = useProjects()
  const { tags, create: createTag } = useTags()

  const [mode, setMode] = useState<EditMode>('range')
  const [from, setFrom] = useState(timestampToTimeString(entry.startTime))
  const [to, setTo] = useState(timestampToTimeString(entry.endTime))
  const initDur = msToDurationParts(entry.duration)
  const [durH, setDurH] = useState(String(initDur.h))
  const [durM, setDurM] = useState(String(initDur.m))
  const [durS, setDurS] = useState(String(initDur.s))
  const [projectId, setProjectId] = useState(entry.projectId ?? '')
  const [description, setDescription] = useState(entry.description)
  const [link, setLink] = useState(entry.link ?? '')
  const [selectedTagId, setSelectedTagId] = useState(entry.tags[0] ?? '')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [saving, setSaving] = useState(false)

  const [showNewProject, setShowNewProject] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')
  const [showNewTag, setShowNewTag] = useState(false)
  const [newTagName, setNewTagName] = useState('')

  // ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !confirmDelete) onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose, confirmDelete])

  const handleAddProject = async () => {
    if (!newProjectName.trim()) return
    const color = PROJECT_COLORS[Math.floor(Math.random() * PROJECT_COLORS.length)]
    const project = await createProject(newProjectName.trim(), color)
    setProjectId(project.id)
    setShowNewProject(false)
    setNewProjectName('')
  }

  const handleAddTag = async () => {
    if (!newTagName.trim()) return
    const tag = await createTag(newTagName.trim())
    setSelectedTagId(tag.id)
    setShowNewTag(false)
    setNewTagName('')
  }

  const handleSave = async () => {
    const tagsValue = selectedTagId ? [selectedTagId] : []

    setSaving(true)
    try {
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
          link: link.trim() || undefined,
          tags: tagsValue,
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
          link: link.trim() || undefined,
          tags: tagsValue,
        })
      }
    } finally {
      setSaving(false)
    }
  }

  const selectedProject = activeProjects.find(p => p.id === projectId)

  return (
    <div
      className="fixed inset-0 bg-black/30 dark:bg-black/50 flex items-end justify-center z-50 backdrop-blur-[2px]"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Edit time entry"
    >
      <div
        className="bg-white dark:bg-dark-elevated rounded-t-2xl w-full max-w-[380px] p-5 flex flex-col gap-4 animate-slide-up max-h-[90vh] overflow-y-auto"
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

        {/* Project selector with inline add */}
        <div>
          <label htmlFor="edit-project" className={labelClass}>Project</label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <select
                id="edit-project"
                value={projectId}
                onChange={(e) => { setProjectId(e.target.value); setShowNewProject(false) }}
                className={`${inputClass} appearance-none pl-7`}
              >
                <option value="">No Project</option>
                {activeProjects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              <span
                className="absolute left-3 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full pointer-events-none border border-stone-200 dark:border-dark-border flex-shrink-0"
                style={selectedProject ? { backgroundColor: selectedProject.color, borderColor: 'transparent' } : undefined}
                aria-hidden="true"
              />
            </div>
            <button
              onClick={() => { setShowNewProject(!showNewProject); setShowNewTag(false) }}
              className={`p-2.5 rounded-lg border transition-colors ${showNewProject ? 'border-indigo-500 text-indigo-500 bg-indigo-50 dark:bg-indigo-500/10' : 'border-stone-200 dark:border-dark-border text-stone-400 dark:text-stone-500 hover:text-indigo-500 hover:border-indigo-400 dark:hover:text-indigo-400 dark:hover:border-indigo-400/60'}`}
              type="button"
              aria-label="Add new project"
              title="Add new project"
            >
              <PlusIcon className="w-4 h-4" />
            </button>
          </div>
          {showNewProject && (
            <div className="flex gap-2 mt-2">
              <input
                type="text"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddProject()}
                placeholder="Project name (auto color)"
                autoFocus
                className={addInputClass}
              />
              <button
                onClick={handleAddProject}
                disabled={!newProjectName.trim()}
                className="px-3 py-2 bg-indigo-500 text-white rounded-lg text-xs font-medium hover:bg-indigo-600 disabled:opacity-40 transition-colors"
              >
                Add
              </button>
            </div>
          )}
        </div>

        {/* Tag selector with inline add */}
        <div>
          <label htmlFor="edit-tag" className={labelClass}>Tag</label>
          <div className="flex gap-2">
            <select
              id="edit-tag"
              value={selectedTagId}
              onChange={(e) => { setSelectedTagId(e.target.value); setShowNewTag(false) }}
              className={`${inputClass} flex-1 appearance-none`}
            >
              <option value="">No Tag</option>
              {tags.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
            <button
              onClick={() => { setShowNewTag(!showNewTag); setShowNewProject(false) }}
              className={`p-2.5 rounded-lg border transition-colors ${showNewTag ? 'border-indigo-500 text-indigo-500 bg-indigo-50 dark:bg-indigo-500/10' : 'border-stone-200 dark:border-dark-border text-stone-400 dark:text-stone-500 hover:text-indigo-500 hover:border-indigo-400 dark:hover:text-indigo-400 dark:hover:border-indigo-400/60'}`}
              type="button"
              aria-label="Add new tag"
              title="Add new tag"
            >
              <PlusIcon className="w-4 h-4" />
            </button>
          </div>
          {showNewTag && (
            <div className="flex gap-2 mt-2">
              <input
                type="text"
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
                placeholder="Tag name"
                autoFocus
                className={addInputClass}
              />
              <button
                onClick={handleAddTag}
                disabled={!newTagName.trim()}
                className="px-3 py-2 bg-indigo-500 text-white rounded-lg text-xs font-medium hover:bg-indigo-600 disabled:opacity-40 transition-colors"
              >
                Add
              </button>
            </div>
          )}
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

        <div>
          <label htmlFor="edit-link" className={labelClass}>Link (optional)</label>
          <input
            id="edit-link"
            type="url"
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder="https://..."
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
                disabled={saving}
                className="flex-1 bg-indigo-500 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm shadow-indigo-500/20"
                aria-label="Save changes"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
