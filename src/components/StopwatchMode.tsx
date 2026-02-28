import { memo } from 'react'
import type { TimerState, Project, Tag } from '@/types'
import { useElapsed } from '@/hooks/useTimerTick'
import ProjectSelector from './ProjectSelector'
import TagSelect from './TagSelect'
import RollingTimer from './RollingTimer'
import { PlayIcon, PauseIcon, StopIcon } from './Icons'

type InputTab = 'description' | 'tag' | 'link'

interface StopwatchModeProps {
  timerState: TimerState
  stateDescription: string
  description: string
  selectedProjectId: string | null
  selectedTagId: string
  link: string
  activeTab: InputTab
  projects: Project[]
  tags: Tag[]
  onDescriptionChange: (v: string) => void
  onProjectChange: (id: string | null) => void
  onTagChange: (id: string) => void
  onLinkChange: (v: string) => void
  onTabChange: (tab: InputTab) => void
  onStart: () => void
  onPause: () => void
  onResume: () => void
  onStop: () => void
}

export default memo(function StopwatchMode({
  timerState, stateDescription,
  description, selectedProjectId, selectedTagId, link, activeTab,
  projects, tags,
  onDescriptionChange, onProjectChange, onTagChange, onLinkChange, onTabChange,
  onStart, onPause, onResume, onStop,
}: StopwatchModeProps) {
  const elapsed = useElapsed(timerState)
  const isRunning = timerState.status === 'running'
  const isPaused = timerState.status === 'paused'
  const isActive = isRunning || isPaused

  return (
    <>
      {/* Timer Display */}
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

      {/* Project Selector */}
      <ProjectSelector
        projects={projects}
        selectedId={selectedProjectId}
        onChange={onProjectChange}
        disabled={isActive}
      />

      {/* Input Tabs */}
      <div className="flex gap-1 bg-stone-100 dark:bg-dark-card rounded-lg p-1">
        {(['description', 'tag', 'link'] as InputTab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => onTabChange(tab)}
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

      {/* Input Fields */}
      {activeTab === 'description' && (
        <input
          type="text"
          placeholder="What are you working on?"
          value={isActive ? stateDescription : description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          disabled={isActive}
          className="border border-stone-300 dark:border-dark-border bg-white dark:bg-dark-card text-stone-900 dark:text-stone-100 dark:placeholder-stone-500 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 dark:focus:ring-indigo-400/40 dark:focus:border-indigo-400 disabled:opacity-50"
          aria-label="Task description"
        />
      )}
      {activeTab === 'tag' && (
        <TagSelect tags={tags} value={selectedTagId} onChange={onTagChange} disabled={isActive} />
      )}
      {activeTab === 'link' && (
        <input
          type="url"
          placeholder="https://..."
          value={link}
          onChange={(e) => onLinkChange(e.target.value)}
          disabled={isActive}
          className="border border-stone-300 dark:border-dark-border bg-white dark:bg-dark-card text-stone-900 dark:text-stone-100 dark:placeholder-stone-500 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 dark:focus:ring-indigo-400/40 dark:focus:border-indigo-400 disabled:opacity-50"
          aria-label="Link URL"
        />
      )}

      {/* Action Buttons */}
      <div className="flex gap-2.5">
        {!isActive ? (
          <button
            onClick={onStart}
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
                onClick={onPause}
                className="flex-1 flex items-center justify-center gap-2 bg-amber-500 text-white py-2.5 rounded-xl font-medium text-sm hover:bg-amber-600 active:scale-[0.98] transition-all shadow-sm shadow-amber-500/30"
                aria-label="Pause timer"
                title="Pause timer (Alt+Shift+Down)"
              >
                <PauseIcon className="w-4 h-4" />
                Pause
              </button>
            ) : (
              <button
                onClick={onResume}
                className="flex-1 flex items-center justify-center gap-2 bg-emerald-500 text-white py-2.5 rounded-xl font-medium text-sm hover:bg-emerald-600 active:scale-[0.98] transition-all shadow-sm shadow-emerald-500/30"
                aria-label="Resume timer"
                title="Resume timer (Alt+Shift+Down)"
              >
                <PlayIcon className="w-4 h-4" />
                Resume
              </button>
            )}
            <button
              onClick={onStop}
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
    </>
  )
})
