import { useState, useEffect, useRef, useCallback, memo, type FC, type RefObject } from 'react'
import type { TimerMode, TimerState } from '@/types'
import { useTimer } from '@/hooks/useTimer'
import { useElapsed } from '@/hooks/useTimerTick'
import { useProjects } from '@/hooks/useProjects'
import { useEntries } from '@/hooks/useEntries'
import { useTags } from '@/hooks/useTags'
import { formatDurationShort } from '@/utils/date'
import { useSettings } from '@/hooks/useSettings'
import { msToHours } from '@/utils/date'
import { ENTRY_SAVE_TIME } from '@shared/constants'
import EntryList from './EntryList'
import GoalProgress from './GoalProgress'
import { TimerIcon, PencilIcon, TomatoIcon } from './Icons'
import StopwatchMode from './StopwatchMode'
import ManualEntryMode from './ManualEntryMode'
import type { ManualEntryData } from './ManualEntryMode'
import PomodoroMode from './PomodoroMode'

type ExtendedMode = TimerMode | 'pomodoro'
type InputTab = 'description' | 'tag' | 'link'

const TIMER_MODES: { id: ExtendedMode; label: string; Icon: FC<{ className?: string }> }[] = [
  { id: 'stopwatch', label: 'Stopwatch', Icon: TimerIcon },
  { id: 'manual', label: 'Manual', Icon: PencilIcon },
  { id: 'pomodoro', label: 'Pomodoro', Icon: TomatoIcon },
]

/** Isolated component that ticks every second — keeps the parent TimerView from re-rendering. */
const LiveSummary = memo(function LiveSummary({
  timerState, totalDuration, dailyTarget, entryListRef,
}: {
  timerState: TimerState
  totalDuration: number
  dailyTarget: number | null | undefined
  entryListRef: RefObject<HTMLDivElement | null>
}) {
  const elapsed = useElapsed(timerState)
  const isActive = timerState.status !== 'idle'
  const total = totalDuration + (isActive ? elapsed : 0)

  return (
    <>
      {dailyTarget != null && dailyTarget > 0 && (
        <GoalProgress
          label="Daily Goal"
          current={msToHours(total)}
          target={dailyTarget}
        />
      )}
      <div ref={entryListRef} className="flex items-center justify-between pt-3 border-t border-stone-200 dark:border-dark-border">
        <span className="text-[11px] font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider">Today</span>
        <span className="text-sm font-semibold text-stone-700 dark:text-stone-200">
          {formatDurationShort(total)}
        </span>
      </div>
    </>
  )
})

export default function TimerView() {
  const {
    state, start, pause, resume, stop,
    idleInfo, idleKeep, idleDiscard,
    pomodoroState, startPomodoro, stopPomodoro, skipPhase,
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

  // Discard alert
  const [discardAlert, setDiscardAlert] = useState<string | null>(null)
  const discardTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function showDiscardAlert(msg: string) {
    if (discardTimerRef.current) clearTimeout(discardTimerRef.current)
    setDiscardAlert(msg)
    discardTimerRef.current = setTimeout(() => setDiscardAlert(null), 5000)
  }

  const entrySaveTimeSecs = settings?.entrySaveTime ?? ENTRY_SAVE_TIME.default

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
    const defaultTag = tags.find(t => t.isDefault)
    return defaultTag?.id ?? ''
  }, [activeProjects, tags])

  // Auto-select linked tag when project changes
  const handleProjectChange = useCallback((projectId: string | null) => {
    setSelectedProjectId(projectId)
    setSelectedTagId(getDefaultTagId(projectId))
  }, [getDefaultTagId])

  // Auto-select default project + tag when not running and no project chosen yet
  useEffect(() => {
    if (!isActive && selectedProjectId === null && activeProjects.length > 0) {
      const defaultProject = activeProjects.find(p => p.isDefault)
      if (defaultProject) {
        setSelectedProjectId(defaultProject.id) // eslint-disable-line react-hooks/set-state-in-effect
        setSelectedTagId(getDefaultTagId(defaultProject.id)) // eslint-disable-line react-hooks/set-state-in-effect
      } else {
        setSelectedTagId(getDefaultTagId(null)) // eslint-disable-line react-hooks/set-state-in-effect
      }
    }
  }, [activeProjects, isActive, selectedProjectId, getDefaultTagId])

  const handleStart = useCallback(async () => {
    if (mode === 'pomodoro') {
      await startPomodoro(selectedProjectId, description)
    } else {
      await start(selectedProjectId, description)
    }
  }, [mode, selectedProjectId, description, startPomodoro, start])

  const scrollToEntries = useCallback((entryId: string) => {
    setHighlightEntryId(entryId)
    requestAnimationFrame(() => {
      entryListRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }, [])

  const processStopResponse = useCallback(async (response: { success: boolean; discarded?: boolean; entry?: import('@/types').TimeEntry }) => {
    if (response.discarded) {
      showDiscardAlert(`Entry discarded \u2014 duration was less than ${entrySaveTimeSecs}s. Change in Settings \u2192 Timer.`)
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
      setSelectedTagId(getDefaultTagId(selectedProjectId))
      scrollToEntries(response.entry.id)
      refetchEntries()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTagId, link, selectedProjectId, getDefaultTagId, update, refetchEntries, scrollToEntries, entrySaveTimeSecs])

  const handleStop = useCallback(async () => {
    const response = pomodoroState.active ? await stopPomodoro() : await stop()
    await processStopResponse(response)
  }, [pomodoroState.active, stopPomodoro, stop, processStopResponse])

  const handleManualSave = useCallback(async (data: ManualEntryData) => {
    const tagsArray = selectedTagId ? [selectedTagId] : []
    await add({
      ...data,
      projectId: selectedProjectId,
      taskId: null,
      description,
      type: 'manual',
      tags: tagsArray,
      link: link.trim() || undefined,
    })

    setDescription('')
    setLink('')
    setSelectedTagId(getDefaultTagId(selectedProjectId))
    scrollToEntries(data.id)
  }, [selectedProjectId, selectedTagId, description, link, getDefaultTagId, add, scrollToEntries])

  const handleContinue = useCallback(async (entryId: string, projectId: string | null, desc: string) => {
    if (isActive) return
    setMode('stopwatch')
    setSelectedProjectId(projectId)
    setDescription(desc)
    await start(projectId, desc, entryId)
  }, [isActive, start])

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

      {/* Active Mode */}
      {mode === 'manual' ? (
        <ManualEntryMode
          description={description}
          selectedProjectId={selectedProjectId}
          selectedTagId={selectedTagId}
          link={link}
          activeTab={activeTab}
          projects={activeProjects}
          tags={tags}
          entrySaveTimeSecs={entrySaveTimeSecs}
          onDescriptionChange={setDescription}
          onProjectChange={handleProjectChange}
          onTagChange={setSelectedTagId}
          onLinkChange={setLink}
          onTabChange={setActiveTab}
          onSave={handleManualSave}
          onShowDiscardAlert={showDiscardAlert}
        />
      ) : mode === 'pomodoro' ? (
        <PomodoroMode
          pomodoroState={pomodoroState}
          isActive={isActive}
          stateDescription={state.description}
          description={description}
          selectedProjectId={selectedProjectId}
          projects={activeProjects}
          settings={settings}
          onDescriptionChange={setDescription}
          onProjectChange={handleProjectChange}
          onStart={handleStart}
          onSkip={skipPhase}
          onStop={handleStop}
        />
      ) : (
        <StopwatchMode
          timerState={state}
          stateDescription={state.description}
          description={description}
          selectedProjectId={selectedProjectId}
          selectedTagId={selectedTagId}
          link={link}
          activeTab={activeTab}
          projects={activeProjects}
          tags={tags}
          onDescriptionChange={setDescription}
          onProjectChange={handleProjectChange}
          onTagChange={setSelectedTagId}
          onLinkChange={setLink}
          onTabChange={setActiveTab}
          onStart={handleStart}
          onPause={pause}
          onResume={resume}
          onStop={handleStop}
        />
      )}

      {/* Daily Goal + Today Summary — isolated to prevent full TimerView re-renders */}
      <LiveSummary
        timerState={state}
        totalDuration={totalDuration}
        dailyTarget={settings?.dailyTarget}
        entryListRef={entryListRef}
      />

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
