import { useState, useEffect } from 'react'
import type { TimeEntry } from '@/types'
import { XIcon } from './Icons'
import { useProjects } from '@/hooks/useProjects'
import { useTags } from '@/hooks/useTags'
import ProjectSelector from './ProjectSelector'
import TagSelect from './TagSelect'

interface EntryEditModalProps {
  entry: TimeEntry
  onSave: (entry: TimeEntry) => Promise<void>
  onDelete: () => Promise<void>
  onClose: () => void
}

type InputType = 'duration' | 'timeRange'
type InputTab = 'description' | 'tag' | 'link'

function timestampToDateString(ts: number): string {
  const d = new Date(ts)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function timestampToTimeString(ts: number): string {
  const d = new Date(ts)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function combineDateAndTime(dateStr: string, timeStr: string): number {
  const [year, month, day] = dateStr.split('-').map(Number)
  const [h, m] = timeStr.split(':').map(Number)
  return new Date(year, month - 1, day, h, m, 0, 0).getTime()
}

function msToDurationParts(ms: number): { h: number; m: number } {
  const totalMinutes = Math.round(ms / 60000)
  return { h: Math.floor(totalMinutes / 60), m: totalMinutes % 60 }
}

export default function EntryEditModal({ entry, onSave, onDelete, onClose }: EntryEditModalProps) {
  const { activeProjects } = useProjects()
  const { tags } = useTags()

  const initDur = msToDurationParts(entry.duration)
  const [inputType, setInputType] = useState<InputType>('timeRange')
  const [editDate, setEditDate] = useState(timestampToDateString(entry.startTime))
  const [from, setFrom] = useState(timestampToTimeString(entry.startTime))
  const [to, setTo] = useState(timestampToTimeString(entry.endTime))
  const [hours, setHours] = useState(String(initDur.h))
  const [minutes, setMinutes] = useState(String(initDur.m))
  const [projectId, setProjectId] = useState<string | null>(entry.projectId ?? null)
  const [description, setDescription] = useState(entry.description)
  const [link, setLink] = useState(entry.link ?? '')
  const [selectedTagId, setSelectedTagId] = useState(entry.tags[0] ?? '')
  const [activeTab, setActiveTab] = useState<InputTab>('description')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !confirmDelete) onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose, confirmDelete])

  const handleSave = async () => {
    setSaving(true)
    try {
      const tagsValue = selectedTagId ? [selectedTagId] : []
      if (inputType === 'timeRange') {
        const startTime = combineDateAndTime(editDate, from)
        const endTime = combineDateAndTime(editDate, to)
        if (endTime <= startTime) return
        await onSave({ ...entry, startTime, endTime, duration: endTime - startTime, projectId, description, link: link.trim() || undefined, tags: tagsValue })
      } else {
        const h = parseInt(hours) || 0
        const m = parseInt(minutes) || 0
        const duration = (h * 3600 + m * 60) * 1000
        if (duration <= 0) return
        const startTime = combineDateAndTime(editDate, from)
        await onSave({ ...entry, startTime, endTime: startTime + duration, duration, projectId, description, link: link.trim() || undefined, tags: tagsValue })
      }
    } finally {
      setSaving(false)
    }
  }

  const timeInputClass = "flex-1 border border-stone-200 dark:border-dark-border bg-white dark:bg-dark-card text-stone-900 dark:text-stone-100 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 dark:focus:ring-indigo-400/40 dark:focus:border-indigo-400"
  const sectionLabel = "text-[11px] font-medium text-stone-500 dark:text-stone-400 uppercase tracking-wider block mb-1.5"
  const stepperBtn = "w-8 h-8 rounded-full border-2 border-stone-300 dark:border-stone-600 bg-white dark:bg-dark-elevated text-stone-400 dark:text-stone-400 flex items-center justify-center hover:border-indigo-400 hover:text-indigo-500 dark:hover:border-indigo-400 dark:hover:text-indigo-400 transition-colors active:scale-95 text-lg leading-none"
  const toggleBtn = (active: boolean) =>
    `text-[11px] font-medium px-2.5 py-1 rounded-md transition-all ${active ? 'bg-white dark:bg-dark-card text-stone-900 dark:text-stone-100 shadow-sm' : 'text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-300'}`
  const tabBtn = (active: boolean) =>
    `flex-1 text-[11px] font-medium py-1 rounded-md transition-all ${active ? 'bg-white dark:bg-dark-card text-stone-900 dark:text-stone-100 shadow-sm' : 'text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-300'}`

  return (
    <div
      className="fixed inset-0 bg-black/30 dark:bg-black/50 flex items-end justify-center z-50 backdrop-blur-[2px]"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Edit time entry"
    >
      <div
        className="bg-white dark:bg-dark-elevated rounded-t-2xl w-full max-w-[380px] animate-slide-up max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center px-5 pt-4 pb-3">
          <h2 className="font-semibold text-sm text-stone-900 dark:text-stone-100">Edit Entry</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-stone-400 dark:text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 hover:bg-stone-100 dark:hover:bg-dark-elevated transition-colors"
            aria-label="Close"
          >
            <XIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Card */}
        <div className="mx-4 mb-4 rounded-2xl border border-stone-200 dark:border-dark-border overflow-visible">

          {/* ── TIME BLOCK ── */}
          <div className="px-3.5 pt-3 pb-2.5 border-b border-stone-100 dark:border-dark-border">
            <span className={sectionLabel}>Time</span>

            {/* Row 1: date + Duration / Range toggle */}
            <div className="flex items-center gap-2 mb-2">
              <input
                type="date"
                value={editDate}
                onChange={(e) => setEditDate(e.target.value || timestampToDateString(entry.startTime))}
                className="flex-1 min-w-0 border border-stone-200 dark:border-dark-border bg-white dark:bg-dark-card text-stone-900 dark:text-stone-100 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 dark:focus:ring-indigo-400/40 dark:focus:border-indigo-400"
                aria-label="Date"
              />
              <div className="flex gap-0.5 bg-stone-100 dark:bg-dark-elevated rounded-lg p-0.5 shrink-0">
                <button onClick={() => setInputType('duration')} aria-pressed={inputType === 'duration'} className={toggleBtn(inputType === 'duration')}>Duration</button>
                <button onClick={() => setInputType('timeRange')} aria-pressed={inputType === 'timeRange'} className={toggleBtn(inputType === 'timeRange')}>Range</button>
              </div>
            </div>

            {/* Row 2: time inputs */}
            {inputType === 'timeRange' ? (
              <div className="flex gap-2 items-center">
                <input type="time" value={from} onChange={(e) => setFrom(e.target.value)} className={timeInputClass} aria-label="From time" />
                <span className="text-stone-300 dark:text-stone-600 text-xs">→</span>
                <input type="time" value={to} onChange={(e) => setTo(e.target.value)} className={timeInputClass} aria-label="To time" />
              </div>
            ) : (
              <div className="flex items-center justify-around py-1">
                {/* Hours stepper */}
                <div className="flex flex-col items-center gap-1">
                  <div className="flex items-center gap-3">
                    <button onClick={() => setHours(h => String(Math.max(0, (parseInt(h) || 0) - 1)))} className={stepperBtn} aria-label="Decrease hours">−</button>
                    <span className="text-2xl font-semibold w-9 text-center tabular-nums text-stone-900 dark:text-stone-100">{parseInt(hours) || 0}</span>
                    <button onClick={() => setHours(h => String(Math.min(23, (parseInt(h) || 0) + 1)))} className={stepperBtn} aria-label="Increase hours">+</button>
                  </div>
                  <span className="text-[10px] text-stone-400 dark:text-stone-400">hours</span>
                </div>

                <span className="text-xl text-stone-200 dark:text-stone-700 mb-3.5">:</span>

                {/* Minutes stepper */}
                <div className="flex flex-col items-center gap-1">
                  <div className="flex items-center gap-3">
                    <button onClick={() => setMinutes(m => String(Math.max(0, (parseInt(m) || 0) - 5)))} className={stepperBtn} aria-label="Decrease minutes">−</button>
                    <span className="text-2xl font-semibold w-9 text-center tabular-nums text-stone-900 dark:text-stone-100">{String(parseInt(minutes) || 0).padStart(2, '0')}</span>
                    <button onClick={() => setMinutes(m => String(Math.min(55, (parseInt(m) || 0) + 5)))} className={stepperBtn} aria-label="Increase minutes">+</button>
                  </div>
                  <span className="text-[10px] text-stone-400 dark:text-stone-400">min</span>
                </div>
              </div>
            )}
          </div>

          {/* ── PROJECT BLOCK ── */}
          <div className="px-3.5 py-2.5 border-b border-stone-100 dark:border-dark-border">
            <span className={sectionLabel}>Project</span>
            <ProjectSelector projects={activeProjects} selectedId={projectId} onChange={setProjectId} disabled={false} />
          </div>

          {/* ── DETAILS BLOCK ── */}
          <div className="px-3.5 py-2.5 border-b border-stone-100 dark:border-dark-border">
            <span className={sectionLabel}>Details</span>
            <div className="flex gap-0.5 bg-stone-100 dark:bg-dark-elevated rounded-lg p-0.5 mb-2">
              {(['description', 'tag', 'link'] as InputTab[]).map((tab) => (
                <button key={tab} onClick={() => setActiveTab(tab)} className={tabBtn(activeTab === tab)} aria-label={`${tab} tab`}>
                  {tab === 'description' ? 'Description' : tab === 'tag' ? 'Tag' : 'Link'}
                </button>
              ))}
            </div>
            {activeTab === 'description' && (
              <textarea
                rows={2}
                placeholder="What did you work on?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full resize-none border border-stone-200 dark:border-dark-border bg-white dark:bg-dark-card text-stone-900 dark:text-stone-100 dark:placeholder-stone-500 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 dark:focus:ring-indigo-400/40 dark:focus:border-indigo-400"
                aria-label="Task description"
              />
            )}
            {activeTab === 'tag' && (
              <TagSelect tags={tags} value={selectedTagId} onChange={setSelectedTagId} />
            )}
            {activeTab === 'link' && (
              <input
                type="url"
                placeholder="https://..."
                value={link}
                onChange={(e) => setLink(e.target.value)}
                className="w-full border border-stone-200 dark:border-dark-border bg-white dark:bg-dark-card text-stone-900 dark:text-stone-100 dark:placeholder-stone-500 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 dark:focus:ring-indigo-400/40 dark:focus:border-indigo-400"
                aria-label="Link URL"
              />
            )}
          </div>

          {/* ── FOOTER ── */}
          <div className="sticky bottom-0 flex items-center justify-between px-3.5 py-2.5 bg-stone-50 dark:bg-dark rounded-b-2xl border-t border-stone-100 dark:border-dark-border">
            {confirmDelete ? (
              <>
                <button onClick={onDelete} className="flex-1 bg-rose-500 text-white py-2 rounded-xl text-xs font-medium hover:bg-rose-600 transition-colors">
                  Confirm Delete
                </button>
                <div className="w-2" />
                <button onClick={() => setConfirmDelete(false)} className="flex-1 border border-stone-200 dark:border-dark-border py-2 rounded-xl text-xs font-medium text-stone-600 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-dark-hover transition-colors">
                  Cancel
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="px-3 py-1.5 rounded-lg border border-rose-200 dark:border-rose-700/40 text-rose-500 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors text-xs font-medium"
                  aria-label="Delete entry"
                >
                  Delete
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-1.5 rounded-lg font-medium text-xs transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-sm shadow-indigo-500/20"
                  aria-label="Save changes"
                >
                  {saving ? 'Saving...' : 'Save entry'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
