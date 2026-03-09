import { memo, type ReactNode } from 'react'
import type { Project, PomodoroState, Settings } from '@/types'
import { usePomodoroRemaining } from '@/hooks/useTimerTick'
import { formatDurationShort } from '@/utils/date'
import ProjectSelector from './ProjectSelector'
import { PlayIcon, StopIcon, SkipIcon } from './Icons'

interface PomodoroModeProps {
  pomodoroState: PomodoroState
  isActive: boolean
  stateDescription: string
  description: string
  selectedProjectId: string | null
  projects: Project[]
  settings: Settings | null
  onDescriptionChange: (v: string) => void
  onProjectChange: (id: string | null) => void
  onStart: () => void
  onSkip: () => void
  onStop: () => void
}

// Multi-stop color: red → orange → yellow → lime → green (t: 0..1)
function pomProgressToColor(t: number): string {
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

const pomodoroPhaseLabel = {
  work: 'Focus',
  shortBreak: 'Short Break',
  longBreak: 'Long Break',
}

// MM:SS formatter — Pomodoro sessions never exceed 60 min
function pomFormatTime(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000))
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

export default memo(function PomodoroMode({
  pomodoroState,
  isActive,
  stateDescription, description, selectedProjectId, projects, settings,
  onDescriptionChange, onProjectChange,
  onStart, onSkip, onStop,
}: PomodoroModeProps) {
  const pomodoroTimeRemaining = usePomodoroRemaining(pomodoroState)
  const pomProgress = pomodoroState.active
    ? 1 - (pomodoroTimeRemaining / pomodoroState.phaseDuration)
    : 0
  const isWorkPhase = pomodoroState.phase === 'work'
  const pomAccent = isWorkPhase
    ? pomProgressToColor(pomProgress)
    : pomProgressToColor(1 - pomProgress)

  return (
    <>
      <div className="flex flex-col items-center gap-3 py-1">
        {/* Circular ring */}
        <div className="relative">
          <svg width="220" height="220" viewBox="0 0 120 120" aria-hidden="true">
            {/* Track */}
            <circle cx="60" cy="60" r="40" fill="none" stroke="currentColor"
              className="text-stone-200 dark:text-dark-elevated"
              strokeWidth="14" />

            {/* Progress arc — 60 segments with gradient colors */}
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

            {/* Cap dot */}
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
                <div className="font-mono font-semibold leading-none text-stone-400 dark:text-stone-400"
                  style={{ fontSize: 28 }}>
                  {`${String(settings?.pomodoro.workMinutes ?? 25).padStart(2, '0')}:00`}
                </div>
                <div className="text-[10px] font-medium uppercase tracking-[0.2em] mt-2 text-stone-400 dark:text-stone-400">
                  Ready
                </div>
              </>
            )}
          </div>
        </div>

        {/* Session dots */}
        {(() => {
          // Derive elapsed from remaining (already tick-driven via usePomodoroRemaining)
          const currentWorkElapsed = pomodoroState.active && pomodoroState.phase === 'work'
            ? pomodoroState.phaseDuration - pomodoroTimeRemaining
            : 0
          const totalFocused = pomodoroState.totalWorkTime + currentWorkElapsed
          const isWorkPhaseActive = pomodoroState.active && pomodoroState.phase === 'work'
          return (
            <div className="flex items-center gap-2">
              {Array.from({ length: settings?.pomodoro.sessionsBeforeLongBreak ?? 4 }).map((_, i) => (
                <div
                  key={i}
                  className={`w-2 h-2 rounded-full transition-all duration-300 ${
                    i < pomodoroState.sessionsCompleted
                      ? 'bg-emerald-500 dark:bg-emerald-400'
                      : i === pomodoroState.sessionsCompleted && isWorkPhaseActive
                        ? 'bg-purple-400 dark:bg-purple-500 animate-pulse'
                        : 'bg-stone-200 dark:bg-stone-700'
                  }`}
                />
              ))}
              {pomodoroState.active && totalFocused > 0 && (
                <span className="text-[10px] text-stone-400 dark:text-stone-400 ml-1">
                  {formatDurationShort(totalFocused)} focused
                </span>
              )}
            </div>
          )
        })()}

        {/* Pomodoro action buttons */}
        <div className="flex gap-2.5 w-full">
          {!isActive ? (
            <button
              onClick={onStart}
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
                onClick={onSkip}
                className="flex-1 flex items-center justify-center gap-2 bg-emerald-500 text-white py-2.5 rounded-xl font-medium text-sm hover:bg-emerald-600 active:scale-[0.98] transition-all shadow-sm shadow-emerald-500/30"
                aria-label="Take break now"
              >
                <SkipIcon className="w-4 h-4" />
                Break
              </button>
              <button
                onClick={onStop}
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
                onClick={onSkip}
                className="flex-1 flex items-center justify-center gap-2 bg-indigo-500 text-white py-2.5 rounded-xl font-medium text-sm hover:bg-indigo-600 active:scale-[0.98] transition-all shadow-sm shadow-indigo-500/30"
                aria-label="Resume focus"
              >
                <PlayIcon className="w-4 h-4" />
                Focus
              </button>
              <button
                onClick={onStop}
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

      {/* Project Selector */}
      <ProjectSelector
        projects={projects}
        selectedId={selectedProjectId}
        onChange={onProjectChange}
        disabled={isActive}
      />

      {/* Description input */}
      <input
        type="text"
        placeholder="What are you working on?"
        value={isActive ? stateDescription : description}
        onChange={(e) => onDescriptionChange(e.target.value)}
        disabled={isActive}
        className="border border-stone-300 dark:border-dark-border bg-white dark:bg-dark-card text-stone-900 dark:text-stone-100 dark:placeholder-stone-500 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 dark:focus:ring-indigo-400/40 dark:focus:border-indigo-400 disabled:opacity-50"
        aria-label="Task description"
      />
    </>
  )
})
