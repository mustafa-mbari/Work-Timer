'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { TimeEntry } from '@/lib/repositories/timeEntries'
import type { ProjectSummary } from '@/lib/repositories/projects'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  entry?: TimeEntry
  projects: ProjectSummary[]
  onSaved: () => void
}

function toTimeStr(ms: number): string {
  const d = new Date(ms)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function toUnixMs(date: string, time: string): number {
  return new Date(`${date}T${time}:00`).getTime()
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10)
}

export default function EntryFormDialog({ open, onOpenChange, entry, projects, onSaved }: Props) {
  const isEdit = !!entry

  const [date, setDate] = useState(todayStr())
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('10:00')
  const [duration, setDuration] = useState(3600000)
  const [type, setType] = useState<TimeEntry['type']>('manual')
  const [projectId, setProjectId] = useState<string>('')
  const [description, setDescription] = useState('')
  const [tags, setTags] = useState('')
  const [link, setLink] = useState('')
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Populate form from entry when editing
  useEffect(() => {
    if (entry) {
      setDate(entry.date)
      setStartTime(toTimeStr(entry.start_time))
      setEndTime(toTimeStr(entry.end_time))
      setDuration(entry.duration)
      setType(entry.type)
      setProjectId(entry.project_id ?? '')
      setDescription(entry.description ?? '')
      setTags(entry.tags?.join(', ') ?? '')
      setLink(entry.link ?? '')
    } else {
      // Reset form for create
      setDate(todayStr())
      setStartTime('09:00')
      setEndTime('10:00')
      setDuration(3600000)
      setType('manual')
      setProjectId('')
      setDescription('')
      setTags('')
      setLink('')
    }
    setErrors({})
  }, [entry, open])

  // Auto-calculate duration when start/end times change
  function handleTimeChange(newStart: string, newEnd: string) {
    const startMs = toUnixMs(date, newStart)
    const endMs = toUnixMs(date, newEnd)
    if (endMs > startMs) {
      setDuration(endMs - startMs)
    }
  }

  function validate(): boolean {
    const errs: Record<string, string> = {}
    if (!date) errs.date = 'Date is required'
    if (!startTime) errs.startTime = 'Start time is required'
    if (!endTime) errs.endTime = 'End time is required'
    const startMs = toUnixMs(date, startTime)
    const endMs = toUnixMs(date, endTime)
    if (endMs <= startMs) errs.endTime = 'End time must be after start time'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return

    setSaving(true)
    try {
      const startMs = toUnixMs(date, startTime)
      const endMs = toUnixMs(date, endTime)
      const calcDuration = endMs - startMs

      const body = {
        id: entry?.id ?? undefined,
        date,
        start_time: startMs,
        end_time: endMs,
        duration: calcDuration > 0 ? calcDuration : duration,
        type,
        project_id: projectId || null,
        task_id: null,
        description: description.trim(),
        tags: tags
          .split(',')
          .map(t => t.trim())
          .filter(Boolean),
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Entry' : 'Add Entry'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          {/* Date */}
          <div className="space-y-1.5">
            <Label htmlFor="entry-date">Date</Label>
            <Input
              id="entry-date"
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              required
            />
            {errors.date && <p className="text-xs text-rose-500">{errors.date}</p>}
          </div>

          {/* Time range */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="entry-start">Start time</Label>
              <Input
                id="entry-start"
                type="time"
                value={startTime}
                onChange={e => {
                  setStartTime(e.target.value)
                  handleTimeChange(e.target.value, endTime)
                }}
                required
              />
              {errors.startTime && <p className="text-xs text-rose-500">{errors.startTime}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="entry-end">End time</Label>
              <Input
                id="entry-end"
                type="time"
                value={endTime}
                onChange={e => {
                  setEndTime(e.target.value)
                  handleTimeChange(startTime, e.target.value)
                }}
                required
              />
              {errors.endTime && <p className="text-xs text-rose-500">{errors.endTime}</p>}
            </div>
          </div>

          {/* Duration display */}
          {duration > 0 && (
            <p className="text-xs text-stone-500 dark:text-stone-400">
              Duration:{' '}
              <span className="font-medium text-stone-700 dark:text-stone-300">
                {Math.floor(duration / 3600000) > 0 && `${Math.floor(duration / 3600000)}h `}
                {Math.round((duration % 3600000) / 60000)}m
              </span>
            </p>
          )}

          {/* Type */}
          <div className="space-y-1.5">
            <Label htmlFor="entry-type">Type</Label>
            <select
              id="entry-type"
              value={type}
              onChange={e => setType(e.target.value as TimeEntry['type'])}
              className="w-full h-9 rounded-lg border border-stone-200 bg-white px-3 text-sm text-stone-900 dark:bg-[var(--dark-card)] dark:border-[var(--dark-border)] dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="manual">Manual</option>
              <option value="stopwatch">Stopwatch</option>
              <option value="pomodoro">Pomodoro</option>
            </select>
          </div>

          {/* Project */}
          <div className="space-y-1.5">
            <Label htmlFor="entry-project">Project</Label>
            <select
              id="entry-project"
              value={projectId}
              onChange={e => setProjectId(e.target.value)}
              className="w-full h-9 rounded-lg border border-stone-200 bg-white px-3 text-sm text-stone-900 dark:bg-[var(--dark-card)] dark:border-[var(--dark-border)] dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">No project</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="entry-desc">Description</Label>
            <textarea
              id="entry-desc"
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={2}
              maxLength={1000}
              placeholder="What did you work on?"
              className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 dark:bg-[var(--dark-card)] dark:border-[var(--dark-border)] dark:text-stone-100 dark:placeholder:text-stone-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
          </div>

          {/* Tags */}
          <div className="space-y-1.5">
            <Label htmlFor="entry-tags">Tags</Label>
            <Input
              id="entry-tags"
              value={tags}
              onChange={e => setTags(e.target.value)}
              placeholder="design, meeting, bug (comma-separated)"
            />
          </div>

          {/* Link */}
          <div className="space-y-1.5">
            <Label htmlFor="entry-link">Link</Label>
            <Input
              id="entry-link"
              type="url"
              value={link}
              onChange={e => setLink(e.target.value)}
              placeholder="https://..."
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? (isEdit ? 'Saving…' : 'Creating…') : isEdit ? 'Save changes' : 'Add entry'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
