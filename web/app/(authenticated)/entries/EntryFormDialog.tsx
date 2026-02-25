'use client'

import { useState, useEffect, useMemo } from 'react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import type { TimeEntry } from '@/lib/repositories/timeEntries'
import type { ProjectSummary } from '@/lib/repositories/projects'
import type { TagSummary } from '@/lib/repositories/tags'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  entry?: TimeEntry
  projects: ProjectSummary[]
  tags?: TagSummary[]
  onSaved: () => void
}

type InputType = 'duration' | 'timeRange'
type InputTab = 'description' | 'tag' | 'link'

function toTimeStr(ms: number): string {
  const d = new Date(ms)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function toUnixMs(date: string, time: string): number {
  return new Date(`${date}T${time}:00`).getTime()
}

function todayStr(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function msToParts(ms: number): { h: number; m: number } {
  const totalMin = Math.round(ms / 60000)
  return { h: Math.floor(totalMin / 60), m: totalMin % 60 }
}

export default function EntryFormDialog({ open, onOpenChange, entry, projects, tags = [], onSaved }: Props) {
  const isEdit = !!entry

  const [date, setDate] = useState(todayStr())
  const [inputType, setInputType] = useState<InputType>('timeRange')
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('10:00')
  const [hours, setHours] = useState(0)
  const [minutes, setMinutes] = useState(0)
  const [type, setType] = useState<TimeEntry['type']>('manual')
  const [projectId, setProjectId] = useState<string>('')
  const [description, setDescription] = useState('')
  const [selectedTagId, setSelectedTagId] = useState('')
  const [link, setLink] = useState('')
  const [activeTab, setActiveTab] = useState<InputTab>('description')
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Populate form from entry when editing
  useEffect(() => {
    if (entry) {
      setDate(entry.date)
      setStartTime(toTimeStr(entry.start_time))
      setEndTime(toTimeStr(entry.end_time))
      const parts = msToParts(entry.duration)
      setHours(parts.h)
      setMinutes(parts.m)
      setType(entry.type)
      setProjectId(entry.project_id ?? '')
      setDescription(entry.description ?? '')
      setSelectedTagId(entry.tags?.[0] ?? '')
      setLink(entry.link ?? '')
      setInputType('timeRange')
    } else {
      setDate(todayStr())
      setStartTime('09:00')
      setEndTime('10:00')
      setHours(0)
      setMinutes(0)
      setType('manual')
      setProjectId('')
      setDescription('')
      setSelectedTagId('')
      setLink('')
      setInputType('timeRange')
    }
    setErrors({})
    setConfirmDelete(false)
    setActiveTab('description')
  }, [entry, open])

  // Duration computed from inputs
  const computedDuration = useMemo(() => {
    if (inputType === 'timeRange') {
      const startMs = toUnixMs(date, startTime)
      const endMs = toUnixMs(date, endTime)
      return endMs > startMs ? endMs - startMs : 0
    }
    return (hours * 3600 + minutes * 60) * 1000
  }, [inputType, date, startTime, endTime, hours, minutes])

  function validate(): boolean {
    const errs: Record<string, string> = {}
    if (!date) errs.date = 'Date is required'
    if (inputType === 'timeRange') {
      if (!startTime) errs.startTime = 'Start time is required'
      if (!endTime) errs.endTime = 'End time is required'
      const startMs = toUnixMs(date, startTime)
      const endMs = toUnixMs(date, endTime)
      if (endMs <= startMs) errs.endTime = 'End time must be after start time'
    } else {
      if (hours === 0 && minutes === 0) errs.duration = 'Duration must be > 0'
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  async function handleSubmit() {
    if (!validate()) return
    setSaving(true)
    try {
      let startMs: number, endMs: number, duration: number
      // Anchor all timestamps to the selected date using local midnight
      const dayStart = toUnixMs(date, '00:00')

      if (inputType === 'timeRange') {
        startMs = toUnixMs(date, startTime)
        endMs = toUnixMs(date, endTime)
        duration = endMs - startMs
      } else {
        duration = (hours * 3600 + minutes * 60) * 1000
        const dayEnd = toUnixMs(date, '23:59')
        const now = Date.now()
        // Today → end at current time; past/future → end at 23:59
        endMs = (now >= dayStart && now <= dayEnd + 60000) ? now : dayEnd
        startMs = endMs - duration
        // Clamp: never go before midnight of the selected date
        if (startMs < dayStart) {
          startMs = dayStart
          duration = endMs - startMs
        }
      }

      // Always derive date from startMs so date and timestamps never mismatch
      const startDate = new Date(startMs)
      const entryDate = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}-${String(startDate.getDate()).padStart(2, '0')}`

      const tagsArray = selectedTagId ? [selectedTagId] : []
      const body = {
        id: entry?.id ?? crypto.randomUUID(),
        date: entryDate,
        start_time: startMs,
        end_time: endMs,
        duration,
        type,
        project_id: projectId || null,
        task_id: null,
        description: description.trim(),
        tags: tagsArray,
        link: link.trim() || null,
      }

      const url = isEdit ? `/api/entries/${entry!.id}` : '/api/entries'
      const method = isEdit ? 'PATCH' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const data = await res.json()
        toast.error(data.error ?? (isEdit ? 'Failed to update entry' : 'Failed to create entry'))
        return
      }

      toast.success(isEdit ? 'Entry updated' : 'Entry created')
      onOpenChange(false)
      onSaved()
    } catch {
      toast.error('Network error')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!entry) return
    setSaving(true)
    try {
      const res = await fetch('/api/entries', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [entry.id] }),
      })
      if (!res.ok) {
        toast.error('Failed to delete entry')
        return
      }
      toast.success('Entry deleted')
      onOpenChange(false)
      onSaved()
    } catch {
      toast.error('Network error')
    } finally {
      setSaving(false)
      setConfirmDelete(false)
    }
  }

  // Shared style helpers
  const sectionLabel = 'text-xs font-medium text-stone-500 dark:text-stone-400 uppercase tracking-wider block mb-2'
  const toggleBtn = (active: boolean) =>
    `text-xs font-medium px-3 py-1.5 rounded-md transition-all ${
      active
        ? 'bg-white dark:bg-[var(--dark-card)] text-stone-900 dark:text-stone-100 shadow-sm'
        : 'text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-300'
    }`
  const stepperBtn =
    'w-9 h-9 rounded-full border-2 border-stone-300 dark:border-stone-600 bg-white dark:bg-[var(--dark-elevated)] text-stone-400 dark:text-stone-500 flex items-center justify-center hover:border-indigo-400 hover:text-indigo-500 dark:hover:border-indigo-400 dark:hover:text-indigo-400 transition-colors active:scale-95 text-lg leading-none select-none'
  const inputClass =
    'w-full border border-stone-200 dark:border-[var(--dark-border)] bg-white dark:bg-[var(--dark-card)] text-stone-900 dark:text-stone-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500'
  const tabBtn = (active: boolean) =>
    `flex-1 text-xs font-medium py-1.5 rounded-md transition-all ${
      active
        ? 'bg-white dark:bg-[var(--dark-card)] text-stone-900 dark:text-stone-100 shadow-sm'
        : 'text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-300'
    }`

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto p-0 gap-0">
        <DialogHeader className="px-5 pt-5 pb-3">
          <DialogTitle>{isEdit ? 'Edit Entry' : 'Add Entry'}</DialogTitle>
        </DialogHeader>

        {/* Sectioned Card */}
        <div className="mx-4 mb-4 rounded-xl border border-stone-200 dark:border-[var(--dark-border)] overflow-visible">
          {/* TIME BLOCK */}
          <div className="px-4 pt-3.5 pb-3 border-b border-stone-100 dark:border-[var(--dark-border)]">
            <span className={sectionLabel}>Time</span>

            {/* Date + toggle */}
            <div className="flex items-center gap-2 mb-3">
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value || todayStr())}
                className={`flex-1 min-w-0 border border-stone-200 dark:border-[var(--dark-border)] bg-white dark:bg-[var(--dark-card)] text-stone-900 dark:text-stone-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500`}
                aria-label="Date"
              />
              <div className="flex gap-0.5 bg-stone-100 dark:bg-[var(--dark-elevated)] rounded-lg p-0.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setInputType('duration')}
                  className={toggleBtn(inputType === 'duration')}
                >
                  Duration
                </button>
                <button
                  type="button"
                  onClick={() => setInputType('timeRange')}
                  className={toggleBtn(inputType === 'timeRange')}
                >
                  Range
                </button>
              </div>
            </div>

            {/* Time inputs */}
            {inputType === 'timeRange' ? (
              <div className="flex gap-2 items-center">
                <input
                  type="time"
                  value={startTime}
                  onChange={e => setStartTime(e.target.value)}
                  className={`flex-1 border border-stone-200 dark:border-[var(--dark-border)] bg-white dark:bg-[var(--dark-card)] text-stone-900 dark:text-stone-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500`}
                  aria-label="Start time"
                />
                <svg className="w-4 h-4 text-stone-300 dark:text-stone-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
                <input
                  type="time"
                  value={endTime}
                  onChange={e => setEndTime(e.target.value)}
                  className={`flex-1 border border-stone-200 dark:border-[var(--dark-border)] bg-white dark:bg-[var(--dark-card)] text-stone-900 dark:text-stone-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500`}
                  aria-label="End time"
                />
              </div>
            ) : (
              <div className="flex items-center justify-around py-2">
                {/* Hours stepper */}
                <div className="flex flex-col items-center gap-1.5">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setHours(h => Math.max(0, h - 1))}
                      className={stepperBtn}
                      aria-label="Decrease hours"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min={0}
                      max={23}
                      value={hours}
                      onChange={e => setHours(Math.max(0, Math.min(23, parseInt(e.target.value) || 0)))}
                      className="text-3xl font-semibold w-12 text-center tabular-nums text-stone-900 dark:text-stone-100 bg-transparent border-none outline-none focus:ring-0 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                      aria-label="Hours"
                    />
                    <button
                      type="button"
                      onClick={() => setHours(h => Math.min(23, h + 1))}
                      className={stepperBtn}
                      aria-label="Increase hours"
                    >
                      +
                    </button>
                  </div>
                  <span className="text-[10px] text-stone-400 dark:text-stone-500">hours</span>
                </div>

                <span className="text-2xl text-stone-200 dark:text-stone-700 mb-4">:</span>

                {/* Minutes stepper */}
                <div className="flex flex-col items-center gap-1.5">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setMinutes(m => Math.max(0, m - 5))}
                      className={stepperBtn}
                      aria-label="Decrease minutes"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min={0}
                      max={59}
                      value={minutes}
                      onChange={e => setMinutes(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))}
                      className="text-3xl font-semibold w-12 text-center tabular-nums text-stone-900 dark:text-stone-100 bg-transparent border-none outline-none focus:ring-0 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                      aria-label="Minutes"
                    />
                    <button
                      type="button"
                      onClick={() => setMinutes(m => Math.min(55, m + 5))}
                      className={stepperBtn}
                      aria-label="Increase minutes"
                    >
                      +
                    </button>
                  </div>
                  <span className="text-[10px] text-stone-400 dark:text-stone-500">min</span>
                </div>
              </div>
            )}

            {/* Duration display for Range mode */}
            {inputType === 'timeRange' && computedDuration > 0 && (
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-2">
                Duration:{' '}
                <span className="font-medium text-stone-700 dark:text-stone-300">
                  {Math.floor(computedDuration / 3600000) > 0 && `${Math.floor(computedDuration / 3600000)}h `}
                  {Math.round((computedDuration % 3600000) / 60000)}m
                </span>
              </p>
            )}

            {errors.endTime && <p className="text-xs text-rose-500 mt-1">{errors.endTime}</p>}
            {errors.duration && <p className="text-xs text-rose-500 mt-1">{errors.duration}</p>}
          </div>

          {/* PROJECT BLOCK */}
          <div className="px-4 py-3 border-b border-stone-100 dark:border-[var(--dark-border)]">
            <span className={sectionLabel}>Project</span>
            <select
              value={projectId}
              onChange={e => {
                const newProjectId = e.target.value
                setProjectId(newProjectId)
                const project = projects.find(p => p.id === newProjectId)
                if (project?.default_tag_id) {
                  setSelectedTagId(project.default_tag_id)
                }
              }}
              className={inputClass}
              aria-label="Select project"
            >
              <option value="">No project</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* DETAILS BLOCK */}
          <div className="px-4 py-3 border-b border-stone-100 dark:border-[var(--dark-border)]">
            <span className={sectionLabel}>Details</span>

            {/* Tab strip */}
            <div className="flex gap-0.5 bg-stone-100 dark:bg-[var(--dark-elevated)] rounded-lg p-0.5 mb-3">
              {(['description', 'tag', 'link'] as InputTab[]).map(tab => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={tabBtn(activeTab === tab)}
                  aria-label={`${tab} tab`}
                >
                  {tab === 'description' ? 'Description' : tab === 'tag' ? 'Tag' : 'Link'}
                </button>
              ))}
            </div>

            {/* Tab content */}
            {activeTab === 'description' && (
              <textarea
                rows={2}
                placeholder="What did you work on?"
                value={description}
                onChange={e => setDescription(e.target.value)}
                maxLength={1000}
                className={`${inputClass} resize-none placeholder:text-stone-400 dark:placeholder:text-stone-600`}
                aria-label="Task description"
              />
            )}
            {activeTab === 'tag' && (
              <select
                value={selectedTagId}
                onChange={e => setSelectedTagId(e.target.value)}
                className={inputClass}
                aria-label="Select tag"
              >
                <option value="">No Tag</option>
                {tags.map(tag => (
                  <option key={tag.id} value={tag.id}>
                    {tag.name}
                  </option>
                ))}
              </select>
            )}
            {activeTab === 'link' && (
              <input
                type="url"
                placeholder="https://..."
                value={link}
                onChange={e => setLink(e.target.value)}
                className={`${inputClass} placeholder:text-stone-400 dark:placeholder:text-stone-600`}
                aria-label="Link URL"
              />
            )}
          </div>

          {/* FOOTER */}
          <div className="flex items-center justify-between px-4 py-3 bg-stone-50 dark:bg-[var(--dark)] rounded-b-xl">
            {confirmDelete ? (
              <>
                <Button
                  variant="destructive"
                  size="sm"
                  className="flex-1"
                  onClick={handleDelete}
                  disabled={saving}
                >
                  Confirm Delete
                </Button>
                <div className="w-2" />
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => setConfirmDelete(false)}
                  disabled={saving}
                >
                  Cancel
                </Button>
              </>
            ) : (
              <>
                {isEdit ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-rose-500 border-rose-200 dark:border-rose-700/40 hover:bg-rose-50 dark:hover:bg-rose-500/10"
                    onClick={() => setConfirmDelete(true)}
                    disabled={saving}
                  >
                    Delete
                  </Button>
                ) : (
                  <div />
                )}
                <Button
                  size="sm"
                  onClick={handleSubmit}
                  disabled={saving}
                >
                  {saving ? (isEdit ? 'Saving...' : 'Creating...') : isEdit ? 'Save entry' : 'Add entry'}
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
