import { useState, useEffect, useRef, useMemo, useCallback, type ReactNode, type FC } from 'react'
import type { TimerMode } from '@/types'
import { useTimer } from '@/hooks/useTimer'
import { useProjects } from '@/hooks/useProjects'
import { useEntries } from '@/hooks/useEntries'
import { useTags } from '@/hooks/useTags'
import { formatDurationShort, getToday } from '@/utils/date'
import { generateId } from '@/utils/id'
import { useSettings } from '@/hooks/useSettings'
import { msToHours } from '@/utils/date'
import { ENTRY_SAVE_TIME } from '@shared/constants'
import ProjectSelector from './ProjectSelector'
import TagSelect from './TagSelect'
import EntryList from './EntryList'
import GoalProgress from './GoalProgress'
import { PlayIcon, PauseIcon, StopIcon, SkipIcon, TimerIcon, PencilIcon, TomatoIcon } from './Icons'
import RollingTimer from './RollingTimer'

type ExtendedMode = TimerMode | 'pomodoro'
type InputTab = 'description' | 'tag' | 'link'

const TIMER_MODES: { id: ExtendedMode; label: string; Icon: FC<{ className?: string }> }[] = [
  { id: 'stopwatch', label: 'Stopwatch', Icon: TimerIcon },
  { id: 'manual', label: 'Manual', Icon: PencilIcon },
  { id: 'pomodoro', label: 'Pomodoro', Icon: TomatoIcon },
]

export default function TimerView() {
  const {
    state, elapsed, start, pause, resume, stop,
    idleInfo, idleKeep, idleDiscard,
    pomodoroState, pomodoroTimeRemaining, startPomodoro, stopPomodoro, skipPhase,
  } = useTimer()
  const { activeProjects } = useProjects()
  const { entries, totalDuration, add, update, remove, refetch: refetchEntries } = useEntries()
  const { activeTags: tags } = useTags()
  const { settings } = useSettings()

  const entryListRef = useRef<HTMLDivElement>(null)
  const [highlightEntryId, setHighlightEntryId] = useState<string | null>(null)
  const clearHighlight = useCallback(() => setHighlightEntryId(null), [])

  const [mode, setMode] = useState<ExtendedMode>('stopwatch')
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
  const [description, setDescription] = useState(state.description)
  const [selectedTagId, setSelectedTagId] = useState<string>('')
  const [link, setLink] = useState<string>('')
  const [activeTab, setActiveTab] = useState<InputTab>('description')

  // Manual mode fields
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

  // Discard alert — shown when an entry is too short
  const [discardAlert, setDiscardAlert] = useState<string | null>(null)
  const discardTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function showDiscardAlert(msg: string) {
    if (discardTimerRef.current) clearTimeout(discardTimerRef.current)
    setDiscardAlert(msg)
    discardTimerRef.current = setTimeout(() => setDiscardAlert(null), 5000)
  }

  const entrySaveTimeSecs = settings?.entrySaveTime ?? ENTRY_SAVE_TIME.default

  // Computed duration in ms from current manual inputs (drives Total display + Save disabled state)
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

  const isRunning = state.status === 'running'
  const isPaused = state.status === 'paused'
  const isActive = isRunning || isPaused

  useEffect(() => {
    if (pomodoroState.active) {
      setMode('pomodoro') // eslint-disable-line react-hooks/set-state-in-effect
    }
  }, [pomodoroState.active])

  // Resolve the best default tag: project-linked tag first, then global default tag
  const getDefaultTagId = useCallback((projectId: string | null): string => {
    if (projectId) {
      const project = activeProjects.find(p => p.id === projectId)
      if (project?.defaultTagId) return project.defaultTagId
    }
    // Fall back to tag marked as isDefault (the user's "favorite" tag)
    const defaultTag = tags.find(t => t.isDefault)
    return defaultTag?.id ?? ''
  }, [activeProjects, tags])

  // Auto-select linked tag when project changes
  const handleProjectChange = (projectId: string | null) => {
    setSelectedProjectId(projectId)
    setSelectedTagId(getDefaultTagId(projectId))
  }

  // Auto-select default project + tag when not running and no project chosen yet
  useEffect(() => {
    if (!isActive && selectedProjectId === null && activeProjects.length > 0) {
      const defaultProject = activeProjects.find(p => p.isDefault)
      if (defaultProject) {
        setSelectedProjectId(defaultProject.id) // eslint-disable-line react-hooks/set-state-in-effect
        setSelectedTagId(getDefaultTagId(defaultProject.id)) // eslint-disable-line react-hooks/set-state-in-effect
      } else {
        // No default project — still try to select the default tag
        setSelectedTagId(getDefaultTagId(null)) // eslint-disable-line react-hooks/set-state-in-effect
      }
    }
  }, [activeProjects, isActive, selectedProjectId, getDefaultTagId])

  const handleStart = async () => {
    if (mode === 'pomodoro') {
      await startPomodoro(selectedProjectId, description)
    } else {
      await start(selectedProjectId, description)
    }
  }

  const processStopResponse = async (response: { success: boolean; discarded?: boolean; entry?: import('@/types').TimeEntry }) => {
    if (response.discarded) {
      showDiscardAlert(`Entry discarded — duration was less than ${entrySaveTimeSecs}s. Change in Settings → Timer.`)
      return
    }
    if (response.success && response.entry) {
      const tagsArray = selectedTagId ? [selectedTagId] : []
      await update({
        ...response.entry,
        tags: tagsArray,
        link: link.trim() || undefined,
      })
      setDescription('')
      setLink('')
      // Re-apply the default tag for the next timer
      setSelectedTagId(getDefaultTagId(selectedProjectId))
      setHighlightEntryId(response.entry.id)
      refetchEntries()
      // Scroll to the entry list after re-render
      requestAnimationFrame(() => {
        entryListRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      })
    }
  }

  const handleStop = async () => {
    const response = pomodoroState.active ? await stopPomodoro() : await stop()
    await processStopResponse(response)
  }

  const handleManualSave = async () => {
    if (!manualDate) return
    let startTime: number
    let endTime: number
    let duration: number

    const baseDate = new Date(manualDate + 'T00:00:00')

    if (manualInputType === 'timeRange') {
      if (!manualFrom || !manualTo) return

      const [fromH, fromM] = manualFrom.split(':').map(Number)
      const [toH, toM] = manualTo.split(':').map(Number)

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

      duration = (hours * 60 + minutes) * 60 * 1000
      endTime = Date.now()
      startTime = endTime - duration
    }

    // Duration gate: discard if shorter than minimum
    const thresholdMs = entrySaveTimeSecs * 1000
    if (duration < thresholdMs) {
      showDiscardAlert(`Entry discarded — duration was less than ${entrySaveTimeSecs}s. Change in Settings → Timer.`)
      return
    }

    const tagsArray = selectedTagId ? [selectedTagId] : []
    const entryId = generateId()

    await add({
      id: entryId,
      date: manualDate,
      startTime,
      endTime,
      duration,
      projectId: selectedProjectId,
      taskId: null,
      description,
      type: 'manual',
      tags: tagsArray,
      link: link.trim() || undefined,
    })

    // Store for "Use last" button
    setLastManualEntry({ projectId: selectedProjectId, tagId: selectedTagId, description })

    setManualDate(getToday())
    setManualFrom('')
    setManualTo('')
    setManualHours('')
    setManualMinutes('')
    setDescription('')
    setLink('')
    // Re-apply the default tag for the next entry
    setSelectedTagId(getDefaultTagId(selectedProjectId))
    setHighlightEntryId(entryId)
    // Scroll to the entry list after re-render
    requestAnimationFrame(() => {
      entryListRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }

  const handleContinue = async (entryId: string, projectId: string | null, desc: string) => {
    if (isActive) return
    setMode('stopwatch')
    setSelectedProjectId(projectId)
    setDescription(desc)
    await start(projectId, desc, entryId)
  }

  const pomodoroPhaseLabel = {
    work: 'Focus',
    shortBreak: 'Short Break',
    longBreak: 'Long Break',
  }

  // Pomodoro ring helpers

  // Multi-stop color: red → orange → yellow → lime → green (t: 0..1)
  const pomProgressToColor = (t: number): string => {
    const c: [number, number, number][] = [
      [239,  68,  68],  // red-500
      [249, 115,  22],  // orange-500
      [234, 179,   8],  // yellow-500
      [132, 204,  22],  // lime-500
      [ 34, 197,  94],  // green-500
    ]
    const s = Math.max(0, Math.min(1, t)) * (c.length - 1)
    const lo = Math.floor(s), hi = Math.min(lo + 1, c.length - 1), f = s - lo
    return `rgb(${Math.round(c[lo][0]+(c[hi][0]-c[lo][0])*f)},${Math.round(c[lo][1]+(c[hi][1]-c[lo][1])*f)},${Math.round(c[lo][2]+(c[hi][2]-c[lo][2])*f)})`
  }

  const pomProgress = pomodoroState.active
    ? 1 - (pomodoroTimeRemaining / pomodoroState.phaseDuration)
    : 0

  const isWorkPhase = pomodoroState.phase === 'work'

  // Dynamic accent that follows progress — used for cap glow and label colour
  const pomAccent = isWorkPhase
    ? pomProgressToColor(pomProgress)
    : pomProgressToColor(1 - pomProgress)

  // MM:SS formatter — Pomodoro sessions never exceed 60 min
  const pomFormatTime = (ms: number) => {
    const s = Math.max(0, Math.floor(ms / 1000))
    return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
  }

  return (
    <div className="flex flex-col px-5 py-4 gap-4">
      {/* Entry Discarded Alert */}
      {discardAlert && (
        <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/40 rounded-xl p-3 flex items-start gap-2.5" role="alert">
          <svg className="w-4 h-4 text-amber-500 dark:text-amber-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
          </svg>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-amber-800 dark:text-amber-300">{discardAlert}</p>
          </div>
          <button
            onClick={() => setDiscardAlert(null)}
            className="text-amber-400 dark:text-amber-600 hover:text-amber-600 dark:hover:text-amber-400 transition-colors shrink-0"
            aria-label="Dismiss alert"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
      )}

      {/* Idle Detection Banner */}
      {idleInfo.pending && (
        <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/40 rounded-xl p-3.5" role="alert">
          <p className="text-xs font-medium text-amber-800 dark:text-amber-300 mb-2.5">
            You were idle for {formatDurationShort(idleInfo.idleDuration)}
          </p>
          <div className="flex gap-2">
            <button
              onClick={idleKeep}
              className="flex-1 bg-emerald-500 text-white text-xs font-medium py-2 rounded-lg hover:bg-emerald-600 transition-colors"
              aria-label="Keep idle time"
            >
              Keep Time
            </button>
            <button
              onClick={idleDiscard}
              className="flex-1 bg-rose-500 text-white text-xs font-medium py-2 rounded-lg hover:bg-rose-600 transition-colors"
              aria-label="Discard idle time"
            >
              Discard
            </button>
          </div>
        </div>
      )}

      {/* Mode Toggle */}
      <div className="flex gap-1 bg-stone-100 dark:bg-dark-card rounded-xl p-1">
        {TIMER_MODES.map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => setMode(id)}
            disabled={isActive && id !== mode}
            className={`flex-1 flex flex-col items-center gap-0.5 py-1.5 rounded-lg text-[10px] font-medium transition-all ${
              mode === id
                ? 'bg-white dark:bg-dark-elevated text-stone-900 dark:text-stone-100 shadow-sm ring-1 ring-stone-200 dark:ring-dark-border'
                : 'text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-300'
            } ${isActive && id !== mode ? 'opacity-40 cursor-not-allowed' : ''}`}
            aria-label={`${label} mode`}
          >
            <Icon className="w-3.5 h-3.5" />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {/* Timer Display */}
      {mode === 'manual' ? (
        <div className="rounded-2xl border border-stone-200 dark:border-dark-border overflow-visible">

          {/* ── TIME BLOCK ── */}
          <div className="px-3.5 pt-3 pb-2.5 border-b border-stone-200 dark:border-dark-border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-medium text-stone-500 dark:text-stone-400 uppercase tracking-wider">Time</span>
              {lastManualEntry && (
                <button
                  onClick={() => {
                    setSelectedProjectId(lastManualEntry.projectId)
                    setSelectedTagId(lastManualEntry.tagId)
                    setDescription(lastManualEntry.description)
                  }}
                  className="text-[11px] font-medium text-indigo-500 dark:text-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-300 transition-colors"
                  aria-label="Fill fields from last saved entry"
                >
                  Use last
                </button>
              )}
            </div>

            {/* Row 1: Date + toggle on the same line */}
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
                      className="w-8 h-8 rounded-full border-2 border-stone-300 dark:border-stone-600 bg-white dark:bg-dark-elevated text-stone-400 dark:text-stone-500 flex items-center justify-center hover:border-indigo-400 hover:text-indigo-500 dark:hover:border-indigo-400 dark:hover:text-indigo-400 transition-colors active:scale-95 text-lg leading-none"
                      aria-label="Decrease hours"
                    >−</button>
                    <span className="text-2xl font-semibold w-9 text-center tabular-nums text-stone-900 dark:text-stone-100">
                      {parseInt(manualHours) || 0}
                    </span>
                    <button
                      onClick={() => setManualHours(h => String(Math.min(23, (parseInt(h) || 0) + 1)))}
                      className="w-8 h-8 rounded-full border-2 border-stone-300 dark:border-stone-600 bg-white dark:bg-dark-elevated text-stone-400 dark:text-stone-500 flex items-center justify-center hover:border-indigo-400 hover:text-indigo-500 dark:hover:border-indigo-400 dark:hover:text-indigo-400 transition-colors active:scale-95 text-lg leading-none"
                      aria-label="Increase hours"
                    >+</button>
                  </div>
                  <span className="text-[10px] text-stone-400 dark:text-stone-500">hours</span>
                </div>

                <span className="text-xl text-stone-200 dark:text-stone-700 mb-3.5">:</span>

                {/* Minutes stepper */}
                <div className="flex flex-col items-center gap-1">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setManualMinutes(m => String(Math.max(0, (parseInt(m) || 0) - 5)))}
                      className="w-8 h-8 rounded-full border-2 border-stone-300 dark:border-stone-600 bg-white dark:bg-dark-elevated text-stone-400 dark:text-stone-500 flex items-center justify-center hover:border-indigo-400 hover:text-indigo-500 dark:hover:border-indigo-400 dark:hover:text-indigo-400 transition-colors active:scale-95 text-lg leading-none"
                      aria-label="Decrease minutes"
                    >−</button>
                    <span className="text-2xl font-semibold w-9 text-center tabular-nums text-stone-900 dark:text-stone-100">
                      {String(parseInt(manualMinutes) || 0).padStart(2, '0')}
                    </span>
                    <button
                      onClick={() => setManualMinutes(m => String(Math.min(55, (parseInt(m) || 0) + 5)))}
                      className="w-8 h-8 rounded-full border-2 border-stone-300 dark:border-stone-600 bg-white dark:bg-dark-elevated text-stone-400 dark:text-stone-500 flex items-center justify-center hover:border-indigo-400 hover:text-indigo-500 dark:hover:border-indigo-400 dark:hover:text-indigo-400 transition-colors active:scale-95 text-lg leading-none"
                      aria-label="Increase minutes"
                    >+</button>
                  </div>
                  <span className="text-[10px] text-stone-400 dark:text-stone-500">min</span>
                </div>
              </div>
            )}
          </div>

          {/* ── PROJECT BLOCK ── */}
          <div className="px-3.5 py-2.5 border-b border-stone-200 dark:border-dark-border">
            <span className="text-[11px] font-medium text-stone-500 dark:text-stone-400 uppercase tracking-wider block mb-1.5">Project</span>
            <ProjectSelector
              projects={activeProjects}
              selectedId={selectedProjectId}
              onChange={handleProjectChange}
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
                  onClick={() => setActiveTab(tab)}
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
                onChange={(e) => setDescription(e.target.value)}
                className="w-full resize-none border border-stone-300 dark:border-dark-border bg-white dark:bg-dark-card text-stone-900 dark:text-stone-100 dark:placeholder-stone-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 dark:focus:ring-indigo-400/40 dark:focus:border-indigo-400"
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
                className="w-full border border-stone-200 dark:border-dark-border bg-white dark:bg-dark-card text-stone-900 dark:text-stone-100 dark:placeholder-stone-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 dark:focus:ring-indigo-400/40 dark:focus:border-indigo-400"
                aria-label="Link URL"
              />
            )}
          </div>

          {/* ── STICKY FOOTER ── */}
          <div className="sticky bottom-0 flex items-center justify-between px-3.5 py-2.5 bg-stone-50 dark:bg-dark rounded-b-2xl border-t border-stone-200 dark:border-dark-border">
            <span className="text-xs font-medium text-stone-500 dark:text-stone-400">
              {manualDuration > 0 ? `Total: ${formatDurationShort(manualDuration)}` : 'Total: —'}
            </span>
            <button
              onClick={handleManualSave}
              disabled={manualDuration === 0}
              className="bg-indigo-500 hover:bg-indigo-600 active:scale-[0.98] text-white px-4 py-1.5 rounded-lg font-medium text-xs transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm shadow-indigo-500/30"
              aria-label="Save manual entry"
            >
              Save entry
            </button>
          </div>
        </div>
      ) : mode === 'pomodoro' ? (
        <div className="flex flex-col items-center gap-3 py-1">
          {/* Circular ring — viewBox 120×120 (same geometry as reference), scaled to 220px */}
          <div className="relative">
            <svg width="220" height="220" viewBox="0 0 120 120" aria-hidden="true">
              {/* Track */}
              <circle cx="60" cy="60" r="40" fill="none" stroke="currentColor"
                className="text-stone-200 dark:text-dark-elevated"
                strokeWidth="14" />

              {/* Progress arc — 60 arc segments, each colored by its position along the arc.
                  Segment i gets color pomProgressToColor(i/60), so:
                    segment 0  → red    (arc start, 12 o'clock)
                    segment 30 → yellow (arc midpoint, 6 o'clock)
                    segment 59 → green  (arc end, back near 12 o'clock)
                  Green only appears at the very last segments near 100% progress. */}
              {pomodoroState.active && pomProgress > 0 && (() => {
                const r = 40, ox = 60, oy = 60, N = 60
                const totalDeg = pomProgress * 360
                const segs: ReactNode[] = []
                for (let i = 0; i < N; i++) {
                  const startDeg = (i / N) * 360
                  if (startDeg >= totalDeg) break
                  const endDeg = Math.min(((i + 1) / N) * 360, totalDeg)
                  const t = (i + 0.5) / N
                  const color = isWorkPhase ? pomProgressToColor(t) : pomProgressToColor(1 - t)
                  const s = (startDeg - 90) * Math.PI / 180
                  const e = (endDeg - 90) * Math.PI / 180
                  const x1 = (ox + r * Math.cos(s)).toFixed(3)
                  const y1 = (oy + r * Math.sin(s)).toFixed(3)
                  const x2 = (ox + r * Math.cos(e)).toFixed(3)
                  const y2 = (oy + r * Math.sin(e)).toFixed(3)
                  segs.push(
                    <path key={i}
                      d={`M ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2}`}
                      fill="none" stroke={color} strokeWidth="14" strokeLinecap="round" />
                  )
                }
                return <>{segs}</>
              })()}

              {/* Cap dot — white with glow in current tip color */}
              {pomodoroState.active && (() => {
                const ang = (-90 + 360 * pomProgress) * (Math.PI / 180)
                const cx = 60 + 40 * Math.cos(ang)
                const cy = 60 + 40 * Math.sin(ang)
                return (
                  <circle cx={cx} cy={cy} r="3.8"
                    fill="rgba(255,255,255,0.95)"
                    style={{ filter: `drop-shadow(0 0 5px ${pomAccent})` }}
                  />
                )
              })()}
            </svg>

            {/* Center content */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              {pomodoroState.active ? (
                <>
                  <div className="font-mono font-bold tracking-tight leading-none text-stone-900 dark:text-stone-100"
                    style={{ fontSize: 34 }}>
                    {pomFormatTime(pomodoroTimeRemaining)}
                  </div>
                  <div className="text-[10px] font-semibold uppercase tracking-[0.2em] mt-2"
                    style={{ color: pomAccent }}>
                    {pomodoroPhaseLabel[pomodoroState.phase]}
                  </div>
                </>
              ) : (
                <>
                  <div className="font-mono font-semibold leading-none text-stone-400 dark:text-stone-500"
                    style={{ fontSize: 28 }}>
                    {`${String(settings?.pomodoro.workMinutes ?? 25).padStart(2, '0')}:00`}
                  </div>
                  <div className="text-[10px] font-medium uppercase tracking-[0.2em] mt-2 text-stone-400 dark:text-stone-500">
                    Ready
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Session dots */}
          <div className="flex items-center gap-2">
            {Array.from({ length: settings?.pomodoro.sessionsBeforeLongBreak ?? 4 }).map((_, i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  i < pomodoroState.sessionsCompleted
                    ? 'bg-emerald-500 dark:bg-emerald-400'
                    : 'bg-stone-200 dark:bg-stone-700'
                }`}
              />
            ))}
            {pomodoroState.active && pomodoroState.totalWorkTime > 0 && (
              <span className="text-[10px] text-stone-400 dark:text-stone-500 ml-1">
                {formatDurationShort(pomodoroState.totalWorkTime)} focused
              </span>
            )}
          </div>

          {/* Pomodoro action buttons — above Project Selector */}
          <div className="flex gap-2.5 w-full">
            {!isActive ? (
              <button
                onClick={handleStart}
                className="flex-1 flex items-center justify-center gap-2 bg-purple-500 hover:bg-purple-600 active:scale-[0.98] text-white py-2.5 rounded-xl font-medium text-sm transition-all shadow-sm shadow-purple-500/30"
                aria-label="Start Pomodoro"
                title="Start timer (Alt+Shift+Up)"
              >
                <PlayIcon className="w-4 h-4" />
                Start Focus
              </button>
            ) : pomodoroState.phase === 'work' ? (
              <>
                <button
                  onClick={skipPhase}
                  className="flex-1 flex items-center justify-center gap-2 bg-emerald-500 text-white py-2.5 rounded-xl font-medium text-sm hover:bg-emerald-600 active:scale-[0.98] transition-all shadow-sm shadow-emerald-500/30"
                  aria-label="Take break now"
                >
                  <SkipIcon className="w-4 h-4" />
                  Break
                </button>
                <button
                  onClick={handleStop}
                  className="flex-1 flex items-center justify-center gap-2 bg-rose-500 text-white py-2.5 rounded-xl font-medium text-sm hover:bg-rose-600 active:scale-[0.98] transition-all shadow-sm shadow-rose-500/30"
                  aria-label="Stop Pomodoro"
                  title="Stop timer (Alt+Shift+Up)"
                >
                  <StopIcon className="w-4 h-4" />
                  Stop
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={skipPhase}
                  className="flex-1 flex items-center justify-center gap-2 bg-indigo-500 text-white py-2.5 rounded-xl font-medium text-sm hover:bg-indigo-600 active:scale-[0.98] transition-all shadow-sm shadow-indigo-500/30"
                  aria-label="Resume focus"
                >
                  <PlayIcon className="w-4 h-4" />
                  Focus
                </button>
                <button
                  onClick={handleStop}
                  className="flex-1 flex items-center justify-center gap-2 bg-rose-500 text-white py-2.5 rounded-xl font-medium text-sm hover:bg-rose-600 active:scale-[0.98] transition-all shadow-sm shadow-rose-500/30"
                  aria-label="Stop Pomodoro"
                  title="Stop timer (Alt+Shift+Up)"
                >
                  <StopIcon className="w-4 h-4" />
                  Stop
                </button>
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="text-center py-5 rounded-xl bg-stone-50 dark:bg-dark-card border border-stone-100 dark:border-dark-border">
          <RollingTimer elapsed={elapsed} />
          {isRunning && (
            <div className="flex items-center justify-center gap-1.5 mt-3">
              <span className="inline-flex items-center gap-1.5 bg-rose-50 dark:bg-rose-900/10 rounded-lg px-2 py-0.5">
                <span className="w-1.5 h-1.5 bg-rose-500 dark:bg-rose-400 rounded-full animate-pulse-soft" aria-hidden="true" />
                <span className="text-[11px] font-medium text-rose-500 dark:text-rose-400">Recording..</span>
              </span>
            </div>
          )}
          {isPaused && (
            <div className="flex items-center justify-center gap-1.5 mt-3">
              <span className="text-[11px] font-medium text-amber-500 dark:text-amber-400">Paused</span>
            </div>
          )}
        </div>
      )}

      {/* Project Selector — stopwatch and pomodoro only; manual has its own inside the card */}
      {mode !== 'manual' && (
        <ProjectSelector
          projects={activeProjects}
          selectedId={selectedProjectId}
          onChange={handleProjectChange}
          disabled={isActive}
        />
      )}

      {/* Input Tabs — stopwatch only */}
      {mode === 'stopwatch' && (
        <div className="flex gap-1 bg-stone-100 dark:bg-dark-card rounded-lg p-1">
          {(['description', 'tag', 'link'] as InputTab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              disabled={isActive}
              className={`flex-1 text-xs font-medium py-1.5 rounded-md transition-all ${
                activeTab === tab
                  ? 'bg-white dark:bg-dark-elevated text-stone-900 dark:text-stone-100 shadow-sm'
                  : 'text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-300'
              } ${isActive ? 'opacity-50 cursor-not-allowed' : ''}`}
              aria-label={`${tab} input`}
            >
              {tab === 'description' ? 'Description' : tab === 'tag' ? 'Tag' : 'Link'}
            </button>
          ))}
        </div>
      )}

      {/* Input Fields — pomodoro description */}
      {mode === 'pomodoro' && (
        <input
          type="text"
          placeholder="What are you working on?"
          value={isActive ? state.description : description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={isActive}
          className="border border-stone-300 dark:border-dark-border bg-white dark:bg-dark-card text-stone-900 dark:text-stone-100 dark:placeholder-stone-600 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 dark:focus:ring-indigo-400/40 dark:focus:border-indigo-400 disabled:opacity-50"
          aria-label="Task description"
        />
      )}

      {/* Input Fields — stopwatch tab content */}
      {mode === 'stopwatch' && (
        <>
          {activeTab === 'description' && (
            <input
              type="text"
              placeholder="What are you working on?"
              value={isActive ? state.description : description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isActive}
              className="border border-stone-300 dark:border-dark-border bg-white dark:bg-dark-card text-stone-900 dark:text-stone-100 dark:placeholder-stone-600 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 dark:focus:ring-indigo-400/40 dark:focus:border-indigo-400 disabled:opacity-50"
              aria-label="Task description"
            />
          )}
          {activeTab === 'tag' && (
            <TagSelect tags={tags} value={selectedTagId} onChange={setSelectedTagId} disabled={isActive} />
          )}
          {activeTab === 'link' && (
            <input
              type="url"
              placeholder="https://..."
              value={link}
              onChange={(e) => setLink(e.target.value)}
              disabled={isActive}
              className="border border-stone-300 dark:border-dark-border bg-white dark:bg-dark-card text-stone-900 dark:text-stone-100 dark:placeholder-stone-600 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 dark:focus:ring-indigo-400/40 dark:focus:border-indigo-400 disabled:opacity-50"
              aria-label="Link URL"
            />
          )}
        </>
      )}

      {/* Action Buttons — stopwatch only (manual save is inside the card; pomodoro buttons live above project selector) */}
      {mode === 'stopwatch' && (
        <div className="flex gap-2.5">
          {!isActive ? (
            <button
              onClick={handleStart}
              className="flex-1 flex items-center justify-center gap-2 bg-indigo-500 hover:bg-indigo-600 active:scale-[0.98] text-white py-2.5 rounded-xl font-medium text-sm transition-all shadow-sm shadow-indigo-500/30"
              aria-label="Start timer"
              title="Start timer (Alt+Shift+Up)"
            >
              <PlayIcon className="w-4 h-4" />
              Start
            </button>
          ) : (
            <>
              {isRunning ? (
                <button
                  onClick={pause}
                  className="flex-1 flex items-center justify-center gap-2 bg-amber-500 text-white py-2.5 rounded-xl font-medium text-sm hover:bg-amber-600 active:scale-[0.98] transition-all shadow-sm shadow-amber-500/30"
                  aria-label="Pause timer"
                  title="Pause timer (Alt+Shift+Down)"
                >
                  <PauseIcon className="w-4 h-4" />
                  Pause
                </button>
              ) : (
                <button
                  onClick={resume}
                  className="flex-1 flex items-center justify-center gap-2 bg-emerald-500 text-white py-2.5 rounded-xl font-medium text-sm hover:bg-emerald-600 active:scale-[0.98] transition-all shadow-sm shadow-emerald-500/30"
                  aria-label="Resume timer"
                  title="Resume timer (Alt+Shift+Down)"
                >
                  <PlayIcon className="w-4 h-4" />
                  Resume
                </button>
              )}
              <button
                onClick={handleStop}
                className="flex-1 flex items-center justify-center gap-2 bg-rose-500 text-white py-2.5 rounded-xl font-medium text-sm hover:bg-rose-600 active:scale-[0.98] transition-all shadow-sm shadow-rose-500/30"
                aria-label="Stop timer"
                title="Stop timer (Alt+Shift+Up)"
              >
                <StopIcon className="w-4 h-4" />
                Stop
              </button>
            </>
          )}
        </div>
      )}

      {/* Daily Goal Progress */}
      {settings?.dailyTarget && (
        <GoalProgress
          label="Daily Goal"
          current={msToHours(totalDuration + (isActive ? elapsed : 0))}
          target={settings.dailyTarget}
        />
      )}

      {/* Today's Summary */}
      <div ref={entryListRef} className="flex items-center justify-between pt-3 border-t border-stone-200 dark:border-dark-border">
        <span className="text-[11px] font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider">Today</span>
        <span className="text-sm font-semibold text-stone-700 dark:text-stone-200">
          {formatDurationShort(totalDuration + (isActive ? elapsed : 0))}
        </span>
      </div>

      {/* Today's Entries */}
      <EntryList
        entries={entries}
        projects={activeProjects}
        onUpdate={update}
        onDelete={remove}
        onContinue={handleContinue}
        highlightEntryId={highlightEntryId}
        onHighlightDone={clearHighlight}
      />
    </div>
  )
}
