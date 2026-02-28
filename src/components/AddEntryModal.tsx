import { useState, useEffect } from 'react'
import { XIcon, PlusIcon } from './Icons'
import { useProjects } from '@/hooks/useProjects'
import { useTags } from '@/hooks/useTags'
import { generateId } from '@/utils/id'
import { saveEntry } from '@/storage'
import ProjectSelector from './ProjectSelector'
import TagSelect from './TagSelect'
import { format, parseISO } from 'date-fns'
import { PROJECT_COLORS } from '@/constants/colors'
import { inputClass, labelClass, addInputClass } from '@/constants/styles'

interface AddEntryModalProps {
  date: string  // YYYY-MM-DD
  onSave: () => void
  onClose: () => void
}

export default function AddEntryModal({ date: initialDate, onSave, onClose }: AddEntryModalProps) {
  const { activeProjects, create: createProject } = useProjects()
  const { tags, create: createTag } = useTags()

  const [date, setDate] = useState(initialDate)
  const [inputType, setInputType] = useState<'timeRange' | 'duration'>('timeRange')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [hours, setHours] = useState('')
  const [minutes, setMinutes] = useState('')
  const [projectId, setProjectId] = useState<string | null>(null)
  const [selectedTagId, setSelectedTagId] = useState('')
  const [description, setDescription] = useState('')
  const [link, setLink] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const [showNewProject, setShowNewProject] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')
  const [showNewTag, setShowNewTag] = useState(false)
  const [newTagName, setNewTagName] = useState('')

  // ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

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
    setError('')
    if (!date) { setError('Please select a date'); return }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) { setError('Invalid date format'); return }

    let startTime: number, endTime: number, duration: number

    const baseDate = new Date(date + 'T00:00:00')
    if (isNaN(baseDate.getTime())) { setError('Invalid date'); return }

    if (inputType === 'timeRange') {
      if (!from || !to) { setError('Please enter start and end times'); return }
      if (!/^\d{2}:\d{2}$/.test(from) || !/^\d{2}:\d{2}$/.test(to)) { setError('Invalid time format'); return }
      const [fromH, fromM] = from.split(':').map(Number)
      const [toH, toM] = to.split(':').map(Number)
      if (fromH > 23 || fromM > 59 || toH > 23 || toM > 59) { setError('Invalid time values'); return }
      const startDate = new Date(baseDate)
      startDate.setHours(fromH, fromM, 0, 0)
      const endDate = new Date(baseDate)
      endDate.setHours(toH, toM, 0, 0)
      if (endDate <= startDate) { setError('End time must be after start time'); return }
      startTime = startDate.getTime()
      endTime = endDate.getTime()
      duration = endTime - startTime
    } else {
      const h = parseInt(hours) || 0
      const m = parseInt(minutes) || 0
      if (h === 0 && m === 0) { setError('Duration must be at least 1 minute'); return }
      duration = (h * 60 + m) * 60 * 1000
      const noon = new Date(baseDate)
      noon.setHours(12, 0, 0, 0)
      endTime = noon.getTime()
      startTime = endTime - duration
    }

    setSaving(true)
    try {
      await saveEntry({
        id: generateId(),
        date,
        startTime,
        endTime,
        duration,
        projectId,
        taskId: null,
        description,
        link: link.trim() || undefined,
        type: 'manual',
        tags: selectedTagId ? [selectedTagId] : [],
      })
      onSave()
    } catch {
      setError('Failed to save entry. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const isValid = inputType === 'timeRange'
    ? Boolean(from && to)
    : (parseInt(hours) || 0) > 0 || (parseInt(minutes) || 0) > 0

  const plusBtnClass = (active: boolean) =>
    `p-2.5 rounded-lg border transition-colors ${active ? 'border-indigo-500 text-indigo-500 bg-indigo-50 dark:bg-indigo-500/10' : 'border-stone-200 dark:border-dark-border text-stone-400 dark:text-stone-400 hover:text-indigo-500 hover:border-indigo-400 dark:hover:text-indigo-400 dark:hover:border-indigo-400/60'}`

  const displayDate = date ? format(parseISO(date), 'EEEE, MMM d yyyy') : ''

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-dark-card rounded-2xl shadow-xl w-full max-w-sm flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-stone-100 dark:border-dark-border flex-shrink-0">
          <div>
            <h2 className="text-sm font-semibold text-stone-900 dark:text-stone-100">Add Entry</h2>
            {displayDate && (
              <p className="text-[11px] text-stone-400 dark:text-stone-400 mt-0.5">{displayDate}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-stone-100 dark:hover:bg-dark-elevated text-stone-400 dark:text-stone-400 transition-colors"
            aria-label="Close"
          >
            <XIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Form — scrollable */}
        <div className="px-5 py-4 flex flex-col gap-3 overflow-y-auto">
          {/* Date */}
          <div>
            <label className={labelClass}>Date</label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className={inputClass}
            />
          </div>

          {/* Input type toggle + time inputs */}
          <div>
            <div className="flex gap-1 bg-stone-100 dark:bg-dark-elevated rounded-lg p-0.5 mb-3">
              <button
                onClick={() => setInputType('timeRange')}
                className={`flex-1 text-xs font-medium py-1.5 rounded-md transition-all ${
                  inputType === 'timeRange'
                    ? 'bg-white dark:bg-dark-card text-stone-900 dark:text-stone-100 shadow-sm'
                    : 'text-stone-500 dark:text-stone-400'
                }`}
              >
                Time Range
              </button>
              <button
                onClick={() => setInputType('duration')}
                className={`flex-1 text-xs font-medium py-1.5 rounded-md transition-all ${
                  inputType === 'duration'
                    ? 'bg-white dark:bg-dark-card text-stone-900 dark:text-stone-100 shadow-sm'
                    : 'text-stone-500 dark:text-stone-400'
                }`}
              >
                Duration
              </button>
            </div>

            {inputType === 'timeRange' ? (
              <div className="flex gap-3 items-center">
                <div className="flex-1">
                  <label className={labelClass}>From</label>
                  <input type="time" value={from} onChange={e => setFrom(e.target.value)} className={inputClass} />
                </div>
                <span className="text-stone-300 dark:text-stone-600 mt-6 text-sm">&rarr;</span>
                <div className="flex-1">
                  <label className={labelClass}>To</label>
                  <input type="time" value={to} onChange={e => setTo(e.target.value)} className={inputClass} />
                </div>
              </div>
            ) : (
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className={labelClass}>Hours</label>
                  <input
                    type="number" min="0" max="23" value={hours}
                    onChange={e => setHours(e.target.value)} placeholder="0"
                    className={inputClass}
                  />
                </div>
                <div className="flex-1">
                  <label className={labelClass}>Minutes</label>
                  <input
                    type="number" min="0" max="59" value={minutes}
                    onChange={e => setMinutes(e.target.value)} placeholder="0"
                    className={inputClass}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Project */}
          <div>
            <label className={labelClass}>Project</label>
            <div className="flex gap-2">
              <div className="flex-1">
                <ProjectSelector projects={activeProjects} selectedId={projectId} onChange={id => { setProjectId(id); setShowNewProject(false) }} />
              </div>
              <button
                onClick={() => { setShowNewProject(!showNewProject); setShowNewTag(false) }}
                className={plusBtnClass(showNewProject)}
                type="button"
                aria-label="Add new project"
              >
                <PlusIcon className="w-4 h-4" />
              </button>
            </div>
            {showNewProject && (
              <div className="flex gap-2 mt-2">
                <input
                  type="text"
                  value={newProjectName}
                  onChange={e => setNewProjectName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddProject()}
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

          {/* Tag */}
          <div>
            <label className={labelClass}>Tag</label>
            <div className="flex gap-2">
              <TagSelect tags={tags} value={selectedTagId} onChange={(id) => { setSelectedTagId(id); setShowNewTag(false) }} className="flex-1" />
              <button
                onClick={() => { setShowNewTag(!showNewTag); setShowNewProject(false) }}
                className={plusBtnClass(showNewTag)}
                type="button"
                aria-label="Add new tag"
              >
                <PlusIcon className="w-4 h-4" />
              </button>
            </div>
            {showNewTag && (
              <div className="flex gap-2 mt-2">
                <input
                  type="text"
                  value={newTagName}
                  onChange={e => setNewTagName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddTag()}
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

          {/* Description */}
          <div>
            <label className={labelClass}>Description</label>
            <input
              type="text"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="What did you work on?"
              className={inputClass}
            />
          </div>

          {/* Link */}
          <div>
            <label className={labelClass}>Link (optional)</label>
            <input
              type="url"
              value={link}
              onChange={e => setLink(e.target.value)}
              placeholder="https://..."
              className={inputClass}
            />
          </div>

          {error && <p className="text-xs text-rose-500">{error}</p>}
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-5 py-4 border-t border-stone-100 dark:border-dark-border flex-shrink-0">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-stone-200 dark:border-dark-border text-sm font-medium text-stone-600 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-dark-elevated transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!isValid || saving}
            className="flex-1 py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors shadow-sm shadow-indigo-500/20"
          >
            {saving ? 'Saving...' : 'Save Entry'}
          </button>
        </div>
      </div>
    </div>
  )
}
