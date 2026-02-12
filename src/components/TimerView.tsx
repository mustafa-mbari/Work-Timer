import { useState, useEffect } from 'react'
import type { TimerMode } from '@/types'
import { useTimer } from '@/hooks/useTimer'
import { useProjects } from '@/hooks/useProjects'
import { useEntries } from '@/hooks/useEntries'
import { formatDuration, formatDurationShort, getToday } from '@/utils/date'
import { generateId } from '@/utils/id'
import { useSettings } from '@/hooks/useSettings'
import { msToHours } from '@/utils/date'
import ProjectSelector from './ProjectSelector'
import EntryList from './EntryList'
import GoalProgress from './GoalProgress'

type ExtendedMode = TimerMode | 'pomodoro'

export default function TimerView() {
  const {
    state, elapsed, start, pause, resume, stop,
    idleInfo, idleKeep, idleDiscard,
    pomodoroState, pomodoroTimeRemaining, startPomodoro, stopPomodoro, skipPhase,
  } = useTimer()
  const { activeProjects } = useProjects()
  const { entries, totalDuration, add, update, remove, refetch: refetchEntries } = useEntries()
  const { settings } = useSettings()

  const [mode, setMode] = useState<ExtendedMode>('stopwatch')
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(state.projectId)
  const [description, setDescription] = useState(state.description)

  // Manual mode fields
  const [manualInputType, setManualInputType] = useState<'timeRange' | 'duration'>('timeRange')
  const [manualFrom, setManualFrom] = useState('')
  const [manualTo, setManualTo] = useState('')
  const [manualHours, setManualHours] = useState('')
  const [manualMinutes, setManualMinutes] = useState('')

  const isRunning = state.status === 'running'
  const isPaused = state.status === 'paused'
  const isActive = isRunning || isPaused

  // Sync mode with pomodoro state when popup reopens
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
      if (response.success) {
        setDescription('')
        refetchEntries()
      }
    } else {
      const response = await stop()
      if (response.success) {
        setDescription('')
        refetchEntries()
      }
    }
  }

  const handleManualSave = async () => {
    const today = getToday()
    let startTime: number
    let endTime: number
    let duration: number

    if (manualInputType === 'timeRange') {
      if (!manualFrom || !manualTo) return

      const [fromH, fromM] = manualFrom.split(':').map(Number)
      const [toH, toM] = manualTo.split(':').map(Number)

      const startDate = new Date()
      startDate.setHours(fromH, fromM, 0, 0)
      const endDate = new Date()
      endDate.setHours(toH, toM, 0, 0)

      if (endDate <= startDate) return

      startTime = startDate.getTime()
      endTime = endDate.getTime()
      duration = endTime - startTime
    } else {
      // Duration mode
      const hours = parseInt(manualHours) || 0
      const minutes = parseInt(manualMinutes) || 0

      if (hours === 0 && minutes === 0) return

      duration = (hours * 60 + minutes) * 60 * 1000
      endTime = Date.now()
      startTime = endTime - duration
    }

    await add({
      id: generateId(),
      date: today,
      startTime,
      endTime,
      duration,
      projectId: selectedProjectId,
      taskId: null,
      description,
      type: 'manual',
      tags: [],
    })

    setManualFrom('')
    setManualTo('')
    setManualHours('')
    setManualMinutes('')
    setDescription('')
  }

  const handleContinue = async (entryId: string, projectId: string | null, desc: string) => {
    if (isActive) return // Don't start if timer is already running

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
    <div className="flex flex-col p-4 gap-3">
      {/* Idle Detection Banner */}
      {idleInfo.pending && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3" role="alert">
          <p className="text-xs font-medium text-amber-800 mb-2">
            You were idle for {formatDurationShort(idleInfo.idleDuration)}
          </p>
          <div className="flex gap-1.5">
            <button
              onClick={idleKeep}
              className="flex-1 bg-green-600 text-white text-xs py-1.5 rounded-md hover:bg-green-700"
              aria-label="Keep idle time"
            >
              Keep
            </button>
            <button
              onClick={idleDiscard}
              className="flex-1 bg-red-500 text-white text-xs py-1.5 rounded-md hover:bg-red-600"
              aria-label="Discard idle time"
            >
              Discard
            </button>
          </div>
        </div>
      )}

      {/* Mode Toggle */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
        {(['stopwatch', 'manual', 'pomodoro'] as ExtendedMode[]).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            disabled={isActive && m !== mode}
            className={`flex-1 text-xs py-1.5 rounded-md transition-colors ${
              mode === m ? 'bg-white text-blue-600 shadow-sm font-medium' : 'text-gray-500'
            } ${isActive && m !== mode ? 'opacity-50 cursor-not-allowed' : ''}`}
            aria-label={`${m} mode`}
          >
            {m === 'stopwatch' ? 'Stopwatch' : m === 'manual' ? 'Manual' : 'Pomodoro'}
          </button>
        ))}
      </div>

      {/* Timer Display */}
      {mode === 'manual' ? (
        <div className="py-4">
          {/* Toggle between Time Range and Duration */}
          <div className="flex gap-1 bg-gray-50 rounded-lg p-0.5 mb-3">
            <button
              onClick={() => setManualInputType('timeRange')}
              className={`flex-1 text-xs py-1.5 rounded-md transition-colors ${
                manualInputType === 'timeRange' ? 'bg-white text-gray-800 shadow-sm font-medium' : 'text-gray-500'
              }`}
            >
              Time Range
            </button>
            <button
              onClick={() => setManualInputType('duration')}
              className={`flex-1 text-xs py-1.5 rounded-md transition-colors ${
                manualInputType === 'duration' ? 'bg-white text-gray-800 shadow-sm font-medium' : 'text-gray-500'
              }`}
            >
              Duration
            </button>
          </div>

          {manualInputType === 'timeRange' ? (
            <div className="flex gap-2 items-center">
              <div className="flex-1">
                <label htmlFor="manual-from" className="text-xs text-gray-500 block mb-1">From</label>
                <input
                  id="manual-from"
                  type="time"
                  value={manualFrom}
                  onChange={(e) => setManualFrom(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <span className="text-gray-400 mt-5">→</span>
              <div className="flex-1">
                <label htmlFor="manual-to" className="text-xs text-gray-500 block mb-1">To</label>
                <input
                  id="manual-to"
                  type="time"
                  value={manualTo}
                  onChange={(e) => setManualTo(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          ) : (
            <div className="flex gap-2 items-center">
              <div className="flex-1">
                <label htmlFor="manual-hours" className="text-xs text-gray-500 block mb-1">Hours</label>
                <input
                  id="manual-hours"
                  type="number"
                  min="0"
                  max="23"
                  value={manualHours}
                  onChange={(e) => setManualHours(e.target.value)}
                  placeholder="0"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex-1">
                <label htmlFor="manual-minutes" className="text-xs text-gray-500 block mb-1">Minutes</label>
                <input
                  id="manual-minutes"
                  type="number"
                  min="0"
                  max="59"
                  value={manualMinutes}
                  onChange={(e) => setManualMinutes(e.target.value)}
                  placeholder="0"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}
        </div>
      ) : mode === 'pomodoro' ? (
        <div className="text-center">
          {/* Pomodoro progress ring */}
          <div className="relative inline-flex items-center justify-center py-2">
            <svg className="w-32 h-32 -rotate-90" viewBox="0 0 120 120" aria-hidden="true">
              <circle cx="60" cy="60" r="52" fill="none" stroke="#e5e7eb" strokeWidth="8" />
              {pomodoroState.active && (() => {
                const progress = 1 - (pomodoroTimeRemaining / pomodoroState.phaseDuration)
                const circumference = 2 * Math.PI * 52
                const offset = circumference * (1 - progress)
                const color = pomodoroState.phase === 'work' ? '#3b82f6' : '#10b981'
                return <circle cx="60" cy="60" r="52" fill="none" stroke={color} strokeWidth="8"
                  strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
                  className="transition-all duration-1000" />
              })()}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className={`text-3xl font-mono font-bold ${
                pomodoroState.active
                  ? pomodoroState.phase === 'work' ? 'text-blue-600' : 'text-green-600'
                  : 'text-gray-800'
              }`}>
                {pomodoroState.active
                  ? formatDuration(pomodoroTimeRemaining)
                  : formatDuration(elapsed)}
              </div>
              {pomodoroState.active && (
                <div className={`text-[10px] font-medium mt-0.5 ${
                  pomodoroState.phase === 'work' ? 'text-blue-500' : 'text-green-500'
                }`}>
                  {pomodoroPhaseLabel[pomodoroState.phase]}
                </div>
              )}
            </div>
          </div>

          {pomodoroState.active && (
            <div className="text-xs text-gray-400 mt-1">
              Session {pomodoroState.sessionsCompleted + (pomodoroState.phase === 'work' ? 1 : 0)}
              {pomodoroState.totalWorkTime > 0 && ` · ${formatDurationShort(pomodoroState.totalWorkTime)} focused`}
            </div>
          )}
        </div>
      ) : (
        <div className="text-center">
          <div
            className={`text-5xl font-mono font-bold tracking-wider py-4 ${
              isRunning ? 'text-blue-600' : isPaused ? 'text-amber-500' : 'text-gray-800'
            }`}
            aria-live="polite"
            aria-label={`Timer: ${formatDuration(elapsed)}`}
          >
            {formatDuration(elapsed)}
          </div>
          {isRunning && (
            <div className="flex items-center justify-center gap-1.5 text-xs text-blue-600">
              <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" aria-hidden="true" />
              Recording
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

      {/* Description */}
      <input
        type="text"
        placeholder="What are you working on?"
        value={isActive ? state.description : description}
        onChange={(e) => setDescription(e.target.value)}
        disabled={isActive}
        className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
        aria-label="Task description"
      />

      {/* Action Buttons */}
      {mode === 'manual' ? (
        <button
          onClick={handleManualSave}
          disabled={
            manualInputType === 'timeRange'
              ? !manualFrom || !manualTo
              : (!manualHours && !manualMinutes) || (parseInt(manualHours || '0') === 0 && parseInt(manualMinutes || '0') === 0)
          }
          className="bg-blue-600 text-white py-2.5 rounded-lg font-medium text-sm hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          aria-label="Save manual entry"
        >
          Save Entry
        </button>
      ) : (
        <div className="flex gap-2">
          {!isActive ? (
            <button
              onClick={handleStart}
              className={`flex-1 text-white py-2.5 rounded-lg font-medium text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                mode === 'pomodoro'
                  ? 'bg-purple-600 hover:bg-purple-700 focus:ring-purple-500'
                  : 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'
              }`}
              aria-label={mode === 'pomodoro' ? 'Start Pomodoro' : 'Start timer'}
              title="Start timer (Alt+Shift+Up)"
            >
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
                        className="flex-1 bg-green-600 text-white py-2.5 rounded-lg font-medium text-sm hover:bg-green-700 transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                        aria-label="Take break now"
                      >
                        Take Break
                      </button>
                      <button
                        onClick={handleStop}
                        className="flex-1 bg-red-500 text-white py-2.5 rounded-lg font-medium text-sm hover:bg-red-600 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                        aria-label="Stop Pomodoro"
                        title="Stop timer (Alt+Shift+Up)"
                      >
                        Stop
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={skipPhase}
                        className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg font-medium text-sm hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                        aria-label="Resume focus"
                      >
                        Resume Focus
                      </button>
                      <button
                        onClick={handleStop}
                        className="flex-1 bg-red-500 text-white py-2.5 rounded-lg font-medium text-sm hover:bg-red-600 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                        aria-label="Stop Pomodoro"
                        title="Stop timer (Alt+Shift+Up)"
                      >
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
                      className="flex-1 bg-amber-500 text-white py-2.5 rounded-lg font-medium text-sm hover:bg-amber-600 transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2"
                      aria-label="Pause timer"
                      title="Pause timer (Alt+Shift+Down)"
                    >
                      Pause
                    </button>
                  ) : (
                    <button
                      onClick={resume}
                      className="flex-1 bg-green-600 text-white py-2.5 rounded-lg font-medium text-sm hover:bg-green-700 transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                      aria-label="Resume timer"
                      title="Resume timer (Alt+Shift+Down)"
                    >
                      Resume
                    </button>
                  )}
                  <button
                    onClick={handleStop}
                    className="flex-1 bg-red-500 text-white py-2.5 rounded-lg font-medium text-sm hover:bg-red-600 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                    aria-label="Stop timer"
                    title="Stop timer (Alt+Shift+Up)"
                  >
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
      <div className="flex items-center justify-between pt-2 border-t border-gray-100">
        <span className="text-xs text-gray-500">Today</span>
        <span className="text-sm font-medium text-gray-700">
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
