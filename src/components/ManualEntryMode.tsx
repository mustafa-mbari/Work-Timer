import { useState, useMemo, memo } from 'react'
import type { Project, Tag } from '@/types'
import { formatDurationShort, getToday } from '@/utils/date'
import { generateId } from '@/utils/id'
import ProjectSelector from './ProjectSelector'
import TagSelect from './TagSelect'

type InputTab = 'description' | 'tag' | 'link'

export interface ManualEntryData {
  id: string
  date: string
  startTime: number
  endTime: number
  duration: number
}

interface ManualEntryModeProps {
  description: string
  selectedProjectId: string | null
  selectedTagId: string
  link: string
  activeTab: InputTab
  projects: Project[]
  tags: Tag[]
  entrySaveTimeSecs: number
  onDescriptionChange: (v: string) => void
  onProjectChange: (id: string | null) => void
  onTagChange: (id: string) => void
  onLinkChange: (v: string) => void
  onTabChange: (tab: InputTab) => void
  onSave: (data: ManualEntryData) => void
  onShowDiscardAlert: (msg: string) => void
}

export default memo(function ManualEntryMode({
  description, selectedProjectId, selectedTagId, link, activeTab,
  projects, tags, entrySaveTimeSecs,
  onDescriptionChange, onProjectChange, onTagChange, onLinkChange, onTabChange,
  onSave, onShowDiscardAlert,
}: ManualEntryModeProps) {
  // Manual-specific state (owned by this component)
  const [manualInputType, setManualInputType] = useState<'timeRange' | 'duration'>('duration')
  const [manualDate, setManualDate] = useState(getToday())
  const [manualFrom, setManualFrom] = useState('')
  const [manualTo, setManualTo] = useState('')
  const [manualHours, setManualHours] = useState('')
  const [manualMinutes, setManualMinutes] = useState('')

  // "Use last values" — stores most recently saved manual entry metadata (session-only)
  const [lastManualEntry, setLastManualEntry] = useState<{
    projectId: string | null
    tagId: string
    description: string
  } | null>(null)

  const manualDuration = useMemo(() => {
    if (manualInputType === 'timeRange' && manualFrom && manualTo) {
      const [fh, fm] = manualFrom.split(':').map(Number)
      const [th, tm] = manualTo.split(':').map(Number)
      const mins = (th * 60 + tm) - (fh * 60 + fm)
      return mins > 0 ? mins * 60 * 1000 : 0
    } else if (manualInputType === 'duration') {
      const h = parseInt(manualHours) || 0
      const m = parseInt(manualMinutes) || 0
      return (h * 60 + m) * 60 * 1000
    }
    return 0
  }, [manualInputType, manualFrom, manualTo, manualHours, manualMinutes])

  const handleSave = () => {
    if (!manualDate) return
    // Validate YYYY-MM-DD format and ensure the date is real
    if (!/^\d{4}-\d{2}-\d{2}$/.test(manualDate)) return
    const baseDate = new Date(manualDate + 'T00:00:00')
    if (isNaN(baseDate.getTime())) return

    let startTime: number
    let endTime: number
    let duration: number

    if (manualInputType === 'timeRange') {
      if (!manualFrom || !manualTo) return
      // Validate HH:MM format
      if (!/^\d{2}:\d{2}$/.test(manualFrom) || !/^\d{2}:\d{2}$/.test(manualTo)) return

      const [fromH, fromM] = manualFrom.split(':').map(Number)
      const [toH, toM] = manualTo.split(':').map(Number)

      if (fromH > 23 || fromM > 59 || toH > 23 || toM > 59) return

      const startDate = new Date(baseDate)
      startDate.setHours(fromH, fromM, 0, 0)
      const endDate = new Date(baseDate)
      endDate.setHours(toH, toM, 0, 0)

      if (endDate <= startDate) return

      startTime = startDate.getTime()
      endTime = endDate.getTime()
      duration = endTime - startTime
    } else {
      const hours = parseInt(manualHours) || 0
      const minutes = parseInt(manualMinutes) || 0

      if (hours === 0 && minutes === 0) return
      if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return

      duration = (hours * 60 + minutes) * 60 * 1000
      endTime = Date.now()
      startTime = endTime - duration
    }

    // Duration gate
    const thresholdMs = entrySaveTimeSecs * 1000
    if (duration < thresholdMs) {
      onShowDiscardAlert(`Entry discarded — duration was less than ${entrySaveTimeSecs}s. Change in Settings \u2192 Timer.`)
      return
    }

    const entryId = generateId()
    onSave({ id: entryId, date: manualDate, startTime, endTime, duration })

    // Store for "Use last" button
    setLastManualEntry({ projectId: selectedProjectId, tagId: selectedTagId, description })

    // Reset manual fields
    setManualDate(getToday())
    setManualFrom('')
    setManualTo('')
    setManualHours('')
    setManualMinutes('')
  }

  return (
    <div className="rounded-2xl border border-stone-200 dark:border-dark-border overflow-visible">
      {/* ── TIME BLOCK ── */}
      <div className="px-3.5 pt-3 pb-2.5 border-b border-stone-200 dark:border-dark-border">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-medium text-stone-500 dark:text-stone-400 uppercase tracking-wider">Time</span>
          {lastManualEntry && (
            <button
              onClick={() => {
                onProjectChange(lastManualEntry.projectId)
                onTagChange(lastManualEntry.tagId)
                onDescriptionChange(lastManualEntry.description)
              }}
              className="text-[11px] font-medium text-indigo-500 dark:text-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-300 transition-colors"
              aria-label="Fill fields from last saved entry"
            >
              Use last
            </button>
          )}
        </div>

        {/* Row 1: Date + toggle */}
        <div className="flex items-center gap-2 mb-2">
          <input
            id="manual-date"
            type="date"
            value={manualDate}
            onChange={(e) => setManualDate(e.target.value || getToday())}
            className="flex-1 min-w-0 border border-stone-300 dark:border-dark-border bg-white dark:bg-dark-card text-stone-900 dark:text-stone-100 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 dark:focus:ring-indigo-400/40 dark:focus:border-indigo-400"
            aria-label="Date"
          />
          <div className="flex gap-0.5 bg-stone-100 dark:bg-dark-elevated rounded-lg p-0.5 shrink-0">
            <button
              onClick={() => setManualInputType('duration')}
              aria-pressed={manualInputType === 'duration'}
              className={`text-[11px] font-medium px-2.5 py-1 rounded-md transition-all ${
                manualInputType === 'duration'
                  ? 'bg-white dark:bg-dark-card text-stone-900 dark:text-stone-100 shadow-sm'
                  : 'text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-300'
              }`}
            >
              Duration
            </button>
            <button
              onClick={() => setManualInputType('timeRange')}
              aria-pressed={manualInputType === 'timeRange'}
              className={`text-[11px] font-medium px-2.5 py-1 rounded-md transition-all ${
                manualInputType === 'timeRange'
                  ? 'bg-white dark:bg-dark-card text-stone-900 dark:text-stone-100 shadow-sm'
                  : 'text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-300'
              }`}
            >
              Range
            </button>
          </div>
        </div>

        {/* Row 2: time inputs */}
        {manualInputType === 'timeRange' ? (
          <div className="flex gap-2 items-center">
            <input
              id="manual-from"
              type="time"
              value={manualFrom}
              onChange={(e) => setManualFrom(e.target.value)}
              className="flex-1 border border-stone-300 dark:border-dark-border bg-white dark:bg-dark-card text-stone-900 dark:text-stone-100 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 dark:focus:ring-indigo-400/40 dark:focus:border-indigo-400"
              aria-label="From time"
            />
            <span className="text-stone-300 dark:text-stone-600 text-xs">&rarr;</span>
            <input
              id="manual-to"
              type="time"
              value={manualTo}
              onChange={(e) => setManualTo(e.target.value)}
              className="flex-1 border border-stone-300 dark:border-dark-border bg-white dark:bg-dark-card text-stone-900 dark:text-stone-100 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 dark:focus:ring-indigo-400/40 dark:focus:border-indigo-400"
              aria-label="To time"
            />
          </div>
        ) : (
          <div className="flex items-center justify-around py-1">
            {/* Hours stepper */}
            <div className="flex flex-col items-center gap-1">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setManualHours(h => String(Math.max(0, (parseInt(h) || 0) - 1)))}
                  className="w-8 h-8 rounded-full border-2 border-stone-300 dark:border-stone-600 bg-white dark:bg-dark-elevated text-stone-400 dark:text-stone-400 flex items-center justify-center hover:border-indigo-400 hover:text-indigo-500 dark:hover:border-indigo-400 dark:hover:text-indigo-400 transition-colors active:scale-95 text-lg leading-none"
                  aria-label="Decrease hours"
                >{'\u2212'}</button>
                <span className="text-2xl font-semibold w-9 text-center tabular-nums text-stone-900 dark:text-stone-100">
                  {parseInt(manualHours) || 0}
                </span>
                <button
                  onClick={() => setManualHours(h => String(Math.min(23, (parseInt(h) || 0) + 1)))}
                  className="w-8 h-8 rounded-full border-2 border-stone-300 dark:border-stone-600 bg-white dark:bg-dark-elevated text-stone-400 dark:text-stone-400 flex items-center justify-center hover:border-indigo-400 hover:text-indigo-500 dark:hover:border-indigo-400 dark:hover:text-indigo-400 transition-colors active:scale-95 text-lg leading-none"
                  aria-label="Increase hours"
                >+</button>
              </div>
              <span className="text-[10px] text-stone-400 dark:text-stone-400">hours</span>
            </div>

            <span className="text-xl text-stone-200 dark:text-stone-700 mb-3.5">:</span>

            {/* Minutes stepper */}
            <div className="flex flex-col items-center gap-1">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setManualMinutes(m => String(Math.max(0, (parseInt(m) || 0) - 5)))}
                  className="w-8 h-8 rounded-full border-2 border-stone-300 dark:border-stone-600 bg-white dark:bg-dark-elevated text-stone-400 dark:text-stone-400 flex items-center justify-center hover:border-indigo-400 hover:text-indigo-500 dark:hover:border-indigo-400 dark:hover:text-indigo-400 transition-colors active:scale-95 text-lg leading-none"
                  aria-label="Decrease minutes"
                >{'\u2212'}</button>
                <span className="text-2xl font-semibold w-9 text-center tabular-nums text-stone-900 dark:text-stone-100">
                  {String(parseInt(manualMinutes) || 0).padStart(2, '0')}
                </span>
                <button
                  onClick={() => setManualMinutes(m => String(Math.min(55, (parseInt(m) || 0) + 5)))}
                  className="w-8 h-8 rounded-full border-2 border-stone-300 dark:border-stone-600 bg-white dark:bg-dark-elevated text-stone-400 dark:text-stone-400 flex items-center justify-center hover:border-indigo-400 hover:text-indigo-500 dark:hover:border-indigo-400 dark:hover:text-indigo-400 transition-colors active:scale-95 text-lg leading-none"
                  aria-label="Increase minutes"
                >+</button>
              </div>
              <span className="text-[10px] text-stone-400 dark:text-stone-400">min</span>
            </div>
          </div>
        )}
      </div>

      {/* ── PROJECT BLOCK ── */}
      <div className="px-3.5 py-2.5 border-b border-stone-200 dark:border-dark-border">
        <span className="text-[11px] font-medium text-stone-500 dark:text-stone-400 uppercase tracking-wider block mb-1.5">Project</span>
        <ProjectSelector
          projects={projects}
          selectedId={selectedProjectId}
          onChange={onProjectChange}
          disabled={false}
        />
      </div>

      {/* ── DETAILS BLOCK ── */}
      <div className="px-3.5 py-2.5 border-b border-stone-200 dark:border-dark-border">
        <span className="text-[11px] font-medium text-stone-500 dark:text-stone-400 uppercase tracking-wider block mb-1.5">Details</span>
        {/* Tab strip */}
        <div className="flex gap-0.5 bg-stone-100 dark:bg-dark-elevated rounded-lg p-0.5 mb-2">
          {(['description', 'tag', 'link'] as InputTab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => onTabChange(tab)}
              className={`flex-1 text-[11px] font-medium py-1 rounded-md transition-all ${
                activeTab === tab
                  ? 'bg-white dark:bg-dark-card text-stone-900 dark:text-stone-100 shadow-sm'
                  : 'text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-300'
              }`}
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
            onChange={(e) => onDescriptionChange(e.target.value)}
            className="w-full resize-none border border-stone-300 dark:border-dark-border bg-white dark:bg-dark-card text-stone-900 dark:text-stone-100 dark:placeholder-stone-500 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 dark:focus:ring-indigo-400/40 dark:focus:border-indigo-400"
            aria-label="Task description"
          />
        )}
        {activeTab === 'tag' && (
          <TagSelect tags={tags} value={selectedTagId} onChange={onTagChange} />
        )}
        {activeTab === 'link' && (
          <input
            type="url"
            placeholder="https://..."
            value={link}
            onChange={(e) => onLinkChange(e.target.value)}
            className="w-full border border-stone-200 dark:border-dark-border bg-white dark:bg-dark-card text-stone-900 dark:text-stone-100 dark:placeholder-stone-500 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 dark:focus:ring-indigo-400/40 dark:focus:border-indigo-400"
            aria-label="Link URL"
          />
        )}
      </div>

      {/* ── STICKY FOOTER ── */}
      <div className="sticky bottom-0 flex items-center justify-between px-3.5 py-2.5 bg-stone-50 dark:bg-dark rounded-b-2xl border-t border-stone-200 dark:border-dark-border">
        <span className="text-xs font-medium text-stone-500 dark:text-stone-400">
          {manualDuration > 0 ? `Total: ${formatDurationShort(manualDuration)}` : 'Total: \u2014'}
        </span>
        <button
          onClick={handleSave}
          disabled={manualDuration === 0}
          className="bg-indigo-500 hover:bg-indigo-600 active:scale-[0.98] text-white px-4 py-1.5 rounded-lg font-medium text-xs transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm shadow-indigo-500/30"
          aria-label="Save manual entry"
        >
          Save entry
        </button>
      </div>
    </div>
  )
})
