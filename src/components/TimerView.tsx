import { useState, useEffect } from 'react'
import type { TimerMode } from '@/types'
import { useTimer } from '@/hooks/useTimer'
import { useProjects } from '@/hooks/useProjects'
import { useEntries } from '@/hooks/useEntries'
import { useTags } from '@/hooks/useTags'
import { formatDuration, formatDurationShort, getToday } from '@/utils/date'
import { generateId } from '@/utils/id'
import { useSettings } from '@/hooks/useSettings'
import { msToHours } from '@/utils/date'
import ProjectSelector from './ProjectSelector'
import EntryList from './EntryList'
import GoalProgress from './GoalProgress'
import { PlayIcon, PauseIcon, StopIcon, SkipIcon } from './Icons'

type ExtendedMode = TimerMode | 'pomodoro'
type InputTab = 'description' | 'workType' | 'link'

export default function TimerView() {
  const {
    state, elapsed, start, pause, resume, stop,
    idleInfo, idleKeep, idleDiscard,
    pomodoroState, pomodoroTimeRemaining, startPomodoro, stopPomodoro, skipPhase,
  } = useTimer()
  const { activeProjects } = useProjects()
  const { entries, totalDuration, add, update, remove, refetch: refetchEntries } = useEntries()
  const { tags } = useTags()
  const { settings } = useSettings()

  const [mode, setMode] = useState<ExtendedMode>('stopwatch')
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
  const [description, setDescription] = useState(state.description)
  const [selectedTagId, setSelectedTagId] = useState<string>('')
  const [link, setLink] = useState<string>('')
  const [activeTab, setActiveTab] = useState<InputTab>('description')

  // Manual mode fields
  const [manualInputType, setManualInputType] = useState<'timeRange' | 'duration'>('timeRange')
  const [manualDate, setManualDate] = useState(getToday())
  const [manualFrom, setManualFrom] = useState('')
  const [manualTo, setManualTo] = useState('')
  const [manualHours, setManualHours] = useState('')
  const [manualMinutes, setManualMinutes] = useState('')

  const isRunning = state.status === 'running'
  const isPaused = state.status === 'paused'
  const isActive = isRunning || isPaused

  useEffect(() => {
    if (pomodoroState.active) {
      setMode('pomodoro')
    }
  }, [pomodoroState.active])

  const handleStart = async () => {
    if (mode === 'pomodoro') {
      await startPomodoro(selectedProjectId, description)
    } else {
      await start(selectedProjectId, description)
    }
  }

  const handleStop = async () => {
    if (pomodoroState.active) {
      const response = await stopPomodoro()
      if (response.success && response.entry) {
        // Update entry with tags and link
        const tagsArray = selectedTagId ? [selectedTagId] : []
        await update({
          ...response.entry,
          tags: tagsArray,
          link: link.trim() || undefined,
        })
        setDescription('')
        setSelectedTagId('')
        setLink('')
        refetchEntries()
      }
    } else {
      const response = await stop()
      if (response.success && response.entry) {
        // Update entry with tags and link
        const tagsArray = selectedTagId ? [selectedTagId] : []
        await update({
          ...response.entry,
          tags: tagsArray,
          link: link.trim() || undefined,
        })
        setDescription('')
        setSelectedTagId('')
        setLink('')
        refetchEntries()
      }
    }
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

    const tagsArray = selectedTagId ? [selectedTagId] : []

    await add({
      id: generateId(),
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

    setManualDate(getToday())
    setManualFrom('')
    setManualTo('')
    setManualHours('')
    setManualMinutes('')
    setDescription('')
    setSelectedTagId('')
    setLink('')
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

  return (
    <div className="flex flex-col px-5 py-4 gap-4">
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
        {(['stopwatch', 'manual', 'pomodoro'] as ExtendedMode[]).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            disabled={isActive && m !== mode}
            className={`flex-1 text-xs font-medium py-2 rounded-lg transition-all ${
              mode === m
                ? 'bg-white dark:bg-dark-elevated text-stone-900 dark:text-stone-100 shadow-sm'
                : 'text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-300'
            } ${isActive && m !== mode ? 'opacity-40 cursor-not-allowed' : ''}`}
            aria-label={`${m} mode`}
          >
            {m === 'stopwatch' ? 'Stopwatch' : m === 'manual' ? 'Manual' : 'Pomodoro'}
          </button>
        ))}
      </div>

      {/* Timer Display */}
      {mode === 'manual' ? (
        <div className="py-2">
          {/* Date */}
          <div className="mb-4">
            <label htmlFor="manual-date" className="text-[11px] font-medium text-stone-500 dark:text-stone-400 block mb-1.5">Date</label>
            <input
              id="manual-date"
              type="date"
              value={manualDate}
              onChange={(e) => setManualDate(e.target.value || getToday())}
              className="w-full border border-stone-200 dark:border-dark-border bg-white dark:bg-dark-card text-stone-900 dark:text-stone-100 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 dark:focus:ring-indigo-400/40 dark:focus:border-indigo-400"
            />
          </div>

          {/* Toggle between Time Range and Duration */}
          <div className="flex gap-1 bg-stone-100 dark:bg-dark-card rounded-lg p-0.5 mb-4">
            <button
              onClick={() => setManualInputType('timeRange')}
              className={`flex-1 text-xs font-medium py-1.5 rounded-md transition-all ${
                manualInputType === 'timeRange'
                  ? 'bg-white dark:bg-dark-elevated text-stone-900 dark:text-stone-100 shadow-sm'
                  : 'text-stone-500 dark:text-stone-400'
              }`}
            >
              Time Range
            </button>
            <button
              onClick={() => setManualInputType('duration')}
              className={`flex-1 text-xs font-medium py-1.5 rounded-md transition-all ${
                manualInputType === 'duration'
                  ? 'bg-white dark:bg-dark-elevated text-stone-900 dark:text-stone-100 shadow-sm'
                  : 'text-stone-500 dark:text-stone-400'
              }`}
            >
              Duration
            </button>
          </div>

          {manualInputType === 'timeRange' ? (
            <div className="flex gap-3 items-center">
              <div className="flex-1">
                <label htmlFor="manual-from" className="text-[11px] font-medium text-stone-500 dark:text-stone-400 block mb-1.5">From</label>
                <input
                  id="manual-from"
                  type="time"
                  value={manualFrom}
                  onChange={(e) => setManualFrom(e.target.value)}
                  className="w-full border border-stone-200 dark:border-dark-border bg-white dark:bg-dark-card text-stone-900 dark:text-stone-100 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 dark:focus:ring-indigo-400/40 dark:focus:border-indigo-400"
                />
              </div>
              <span className="text-stone-300 dark:text-stone-600 mt-6 text-sm">&rarr;</span>
              <div className="flex-1">
                <label htmlFor="manual-to" className="text-[11px] font-medium text-stone-500 dark:text-stone-400 block mb-1.5">To</label>
                <input
                  id="manual-to"
                  type="time"
                  value={manualTo}
                  onChange={(e) => setManualTo(e.target.value)}
                  className="w-full border border-stone-200 dark:border-dark-border bg-white dark:bg-dark-card text-stone-900 dark:text-stone-100 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 dark:focus:ring-indigo-400/40 dark:focus:border-indigo-400"
                />
              </div>
            </div>
          ) : (
            <div className="flex gap-3 items-center">
              <div className="flex-1">
                <label htmlFor="manual-hours" className="text-[11px] font-medium text-stone-500 dark:text-stone-400 block mb-1.5">Hours</label>
                <input
                  id="manual-hours"
                  type="number"
                  min="0"
                  max="23"
                  value={manualHours}
                  onChange={(e) => setManualHours(e.target.value)}
                  placeholder="0"
                  className="w-full border border-stone-200 dark:border-dark-border bg-white dark:bg-dark-card text-stone-900 dark:text-stone-100 dark:placeholder-stone-600 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 dark:focus:ring-indigo-400/40 dark:focus:border-indigo-400"
                />
              </div>
              <div className="flex-1">
                <label htmlFor="manual-minutes" className="text-[11px] font-medium text-stone-500 dark:text-stone-400 block mb-1.5">Minutes</label>
                <input
                  id="manual-minutes"
                  type="number"
                  min="0"
                  max="59"
                  value={manualMinutes}
                  onChange={(e) => setManualMinutes(e.target.value)}
                  placeholder="0"
                  className="w-full border border-stone-200 dark:border-dark-border bg-white dark:bg-dark-card text-stone-900 dark:text-stone-100 dark:placeholder-stone-600 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 dark:focus:ring-indigo-400/40 dark:focus:border-indigo-400"
                />
              </div>
            </div>
          )}
        </div>
      ) : mode === 'pomodoro' ? (
        <div className="text-center">
          {/* Pomodoro progress ring */}
          <div className="relative inline-flex items-center justify-center py-3">
            <svg className="w-36 h-36 -rotate-90" viewBox="0 0 120 120" aria-hidden="true">
              <circle cx="60" cy="60" r="52" fill="none" stroke="currentColor" className="text-stone-100 dark:text-dark-elevated" strokeWidth="6" />
              {pomodoroState.active && (() => {
                const progress = 1 - (pomodoroTimeRemaining / pomodoroState.phaseDuration)
                const circumference = 2 * Math.PI * 52
                const offset = circumference * (1 - progress)
                const color = pomodoroState.phase === 'work' ? '#6366F1' : '#10B981'
                return <circle cx="60" cy="60" r="52" fill="none" stroke={color} strokeWidth="6"
                  strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
                  className="transition-all duration-1000" />
              })()}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className={`text-3xl font-mono font-semibold tracking-tight ${
                pomodoroState.active
                  ? pomodoroState.phase === 'work' ? 'text-indigo-600 dark:text-indigo-400' : 'text-emerald-600 dark:text-emerald-400'
                  : 'text-stone-800 dark:text-stone-200'
              }`}>
                {pomodoroState.active
                  ? formatDuration(pomodoroTimeRemaining)
                  : formatDuration(elapsed)}
              </div>
              {pomodoroState.active && (
                <div className={`text-[11px] font-medium mt-1 ${
                  pomodoroState.phase === 'work' ? 'text-indigo-500 dark:text-indigo-400' : 'text-emerald-500 dark:text-emerald-400'
                }`}>
                  {pomodoroPhaseLabel[pomodoroState.phase]}
                </div>
              )}
            </div>
          </div>

          {pomodoroState.active && (
            <div className="text-[11px] text-stone-400 dark:text-stone-500 mt-1">
              Session {pomodoroState.sessionsCompleted + (pomodoroState.phase === 'work' ? 1 : 0)}
              {pomodoroState.totalWorkTime > 0 && ` · ${formatDurationShort(pomodoroState.totalWorkTime)} focused`}
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-4">
          <div
            className={`text-[44px] font-mono font-semibold tracking-tight leading-none ${
              isRunning ? 'text-indigo-600 dark:text-indigo-400' : isPaused ? 'text-amber-500 dark:text-amber-400' : 'text-stone-800 dark:text-stone-200'
            }`}
            aria-live="polite"
            aria-label={`Timer: ${formatDuration(elapsed)}`}
          >
            {formatDuration(elapsed)}
          </div>
          {isRunning && (
            <div className="flex items-center justify-center gap-1.5 mt-2">
              <span className="w-1.5 h-1.5 bg-rose-500 dark:bg-rose-400 rounded-full animate-pulse-soft" aria-hidden="true" />
              <span className="text-[11px] font-medium text-rose-500 dark:text-rose-400">Recording..</span>
            </div>
          )}
          {isPaused && (
            <div className="flex items-center justify-center gap-1.5 mt-2">
              <span className="text-[11px] font-medium text-amber-500 dark:text-amber-400">Paused</span>
            </div>
          )}
        </div>
      )}

      {/* Project Selector */}
      <ProjectSelector
        projects={activeProjects}
        selectedId={selectedProjectId}
        onChange={setSelectedProjectId}
        disabled={isActive}
      />

      {/* Input Tabs (only for stopwatch and manual modes) */}
      {mode !== 'pomodoro' && (
        <div className="flex gap-1 bg-stone-100 dark:bg-dark-card rounded-lg p-1">
          {(['description', 'workType', 'link'] as InputTab[]).map((tab) => (
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
              {tab === 'description' ? 'Description' : tab === 'workType' ? 'Work Type' : 'Link'}
            </button>
          ))}
        </div>
      )}

      {/* Input Fields based on active tab */}
      {mode === 'pomodoro' ? (
        <input
          type="text"
          placeholder="What are you working on?"
          value={isActive ? state.description : description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={isActive}
          className="border border-stone-200 dark:border-dark-border bg-white dark:bg-dark-card text-stone-900 dark:text-stone-100 dark:placeholder-stone-600 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 dark:focus:ring-indigo-400/40 dark:focus:border-indigo-400 disabled:opacity-50"
          aria-label="Task description"
        />
      ) : (
        <>
          {activeTab === 'description' && (
            <input
              type="text"
              placeholder="What are you working on?"
              value={isActive ? state.description : description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isActive}
              className="border border-stone-200 dark:border-dark-border bg-white dark:bg-dark-card text-stone-900 dark:text-stone-100 dark:placeholder-stone-600 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 dark:focus:ring-indigo-400/40 dark:focus:border-indigo-400 disabled:opacity-50"
              aria-label="Task description"
            />
          )}
          {activeTab === 'workType' && (
            <select
              value={selectedTagId}
              onChange={(e) => setSelectedTagId(e.target.value)}
              disabled={isActive}
              className="w-full border border-stone-200 dark:border-dark-border bg-white dark:bg-dark-card text-stone-900 dark:text-stone-100 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 dark:focus:ring-indigo-400/40 dark:focus:border-indigo-400 disabled:opacity-50"
              aria-label="Select work type"
            >
              <option value="">No Type</option>
              {tags.map((tag) => (
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
              onChange={(e) => setLink(e.target.value)}
              disabled={isActive}
              className="border border-stone-200 dark:border-dark-border bg-white dark:bg-dark-card text-stone-900 dark:text-stone-100 dark:placeholder-stone-600 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 dark:focus:ring-indigo-400/40 dark:focus:border-indigo-400 disabled:opacity-50"
              aria-label="Link URL"
            />
          )}
        </>
      )}

      {/* Action Buttons */}
      {mode === 'manual' ? (
        <button
          onClick={handleManualSave}
          disabled={
            manualInputType === 'timeRange'
              ? !manualFrom || !manualTo
              : (!manualHours && !manualMinutes) || (parseInt(manualHours || '0') === 0 && parseInt(manualMinutes || '0') === 0)
          }
          className="bg-indigo-500 hover:bg-indigo-600 text-white py-2.5 rounded-xl font-medium text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-sm shadow-indigo-500/20"
          aria-label="Save manual entry"
        >
          Save Entry
        </button>
      ) : (
        <div className="flex gap-2.5">
          {!isActive ? (
            <button
              onClick={handleStart}
              className={`flex-1 flex items-center justify-center gap-2 text-white py-2.5 rounded-xl font-medium text-sm transition-colors shadow-sm ${
                mode === 'pomodoro'
                  ? 'bg-purple-500 hover:bg-purple-600 shadow-purple-500/20'
                  : 'bg-indigo-500 hover:bg-indigo-600 shadow-indigo-500/20'
              }`}
              aria-label={mode === 'pomodoro' ? 'Start Pomodoro' : 'Start timer'}
              title="Start timer (Alt+Shift+Up)"
            >
              <PlayIcon className="w-4 h-4" />
              {mode === 'pomodoro' ? 'Start Focus' : 'Start'}
            </button>
          ) : (
            <>
              {pomodoroState.active ? (
                <>
                  {pomodoroState.phase === 'work' ? (
                    <>
                      <button
                        onClick={skipPhase}
                        className="flex-1 flex items-center justify-center gap-2 bg-emerald-500 text-white py-2.5 rounded-xl font-medium text-sm hover:bg-emerald-600 transition-colors shadow-sm shadow-emerald-500/20"
                        aria-label="Take break now"
                      >
                        <SkipIcon className="w-4 h-4" />
                        Break
                      </button>
                      <button
                        onClick={handleStop}
                        className="flex-1 flex items-center justify-center gap-2 bg-rose-500 text-white py-2.5 rounded-xl font-medium text-sm hover:bg-rose-600 transition-colors shadow-sm shadow-rose-500/20"
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
                        className="flex-1 flex items-center justify-center gap-2 bg-indigo-500 text-white py-2.5 rounded-xl font-medium text-sm hover:bg-indigo-600 transition-colors shadow-sm shadow-indigo-500/20"
                        aria-label="Resume focus"
                      >
                        <PlayIcon className="w-4 h-4" />
                        Focus
                      </button>
                      <button
                        onClick={handleStop}
                        className="flex-1 flex items-center justify-center gap-2 bg-rose-500 text-white py-2.5 rounded-xl font-medium text-sm hover:bg-rose-600 transition-colors shadow-sm shadow-rose-500/20"
                        aria-label="Stop Pomodoro"
                        title="Stop timer (Alt+Shift+Up)"
                      >
                        <StopIcon className="w-4 h-4" />
                        Stop
                      </button>
                    </>
                  )}
                </>
              ) : (
                <>
                  {isRunning ? (
                    <button
                      onClick={pause}
                      className="flex-1 flex items-center justify-center gap-2 bg-amber-500 text-white py-2.5 rounded-xl font-medium text-sm hover:bg-amber-600 transition-colors shadow-sm shadow-amber-500/20"
                      aria-label="Pause timer"
                      title="Pause timer (Alt+Shift+Down)"
                    >
                      <PauseIcon className="w-4 h-4" />
                      Pause
                    </button>
                  ) : (
                    <button
                      onClick={resume}
                      className="flex-1 flex items-center justify-center gap-2 bg-emerald-500 text-white py-2.5 rounded-xl font-medium text-sm hover:bg-emerald-600 transition-colors shadow-sm shadow-emerald-500/20"
                      aria-label="Resume timer"
                      title="Resume timer (Alt+Shift+Down)"
                    >
                      <PlayIcon className="w-4 h-4" />
                      Resume
                    </button>
                  )}
                  <button
                    onClick={handleStop}
                    className="flex-1 flex items-center justify-center gap-2 bg-rose-500 text-white py-2.5 rounded-xl font-medium text-sm hover:bg-rose-600 transition-colors shadow-sm shadow-rose-500/20"
                    aria-label="Stop timer"
                    title="Stop timer (Alt+Shift+Up)"
                  >
                    <StopIcon className="w-4 h-4" />
                    Stop
                  </button>
                </>
              )}
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
      <div className="flex items-center justify-between pt-3 border-t border-stone-100 dark:border-dark-border">
        <span className="text-[11px] font-medium text-stone-400 dark:text-stone-500 uppercase tracking-wider">Today</span>
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
      />
    </div>
  )
}
