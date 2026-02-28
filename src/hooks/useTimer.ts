import { useState, useEffect, useCallback } from 'react'
import type { TimerState, TimerMessage, TimerResponse, IdleInfo, PomodoroState } from '@/types'
import { POMODORO_WORK_MS } from '@/constants/timers'
// NOTE: Real-time elapsed/pomodoroTimeRemaining are now computed by individual
// components via useElapsed / usePomodoroRemaining (src/hooks/useTimerTick.ts).
// This avoids re-rendering the entire TimerView tree every second.

const DEFAULT_STATE: TimerState = {
  status: 'idle',
  projectId: null,
  description: '',
  startTime: null,
  elapsed: 0,
  pausedAt: null,
  continuingEntryId: null,
}

const DEFAULT_IDLE: IdleInfo = {
  idleStartedAt: null,
  idleDuration: 0,
  pending: false,
}

const DEFAULT_POMODORO: PomodoroState = {
  active: false,
  phase: 'work',
  phaseStartedAt: null,
  phaseDuration: POMODORO_WORK_MS,
  sessionsCompleted: 0,
  totalWorkTime: 0,
  remainingWork: 0,
  accumWork: 0,
}

function sendMessage(message: TimerMessage): Promise<TimerResponse> {
  return chrome.runtime.sendMessage(message)
}

export function useTimer() {
  const [state, setState] = useState<TimerState>(DEFAULT_STATE)
  const [idleInfo, setIdleInfo] = useState<IdleInfo>(DEFAULT_IDLE)
  const [pomodoroState, setPomodoroState] = useState<PomodoroState>(DEFAULT_POMODORO)
  const fetchState = useCallback(async () => {
    try {
      const response = await sendMessage({ action: 'GET_TIMER_STATE' })
      if (response.success) {
        if (response.state) setState(response.state)
        if (response.idleInfo) setIdleInfo(response.idleInfo)
        if (response.pomodoroState) setPomodoroState(response.pomodoroState)
      }
    } catch {
      // Extension context may not be ready
    }
  }, [])

  useEffect(() => {
    fetchState()
  }, [fetchState])

  // Listen for TIMER_SYNC broadcasts from background instead of polling every 5s
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const listener = (message: any) => {
      if (message?.action === 'TIMER_SYNC') {
        if (message.state) setState(message.state)
        if (message.idleInfo) setIdleInfo(message.idleInfo)
        if (message.pomodoroState) setPomodoroState(message.pomodoroState)
      }
    }
    chrome.runtime.onMessage.addListener(listener)
    return () => chrome.runtime.onMessage.removeListener(listener)
  }, [])

  const start = useCallback(async (projectId: string | null, description: string, continuingEntryId: string | null = null) => {
    const response = await sendMessage({
      action: 'START_TIMER',
      payload: { projectId, description, continuingEntryId },
    })
    if (response.success && response.state) setState(response.state)
    return response
  }, [])

  const pause = useCallback(async () => {
    const response = await sendMessage({ action: 'PAUSE_TIMER' })
    if (response.success && response.state) setState(response.state)
    return response
  }, [])

  const resume = useCallback(async () => {
    const response = await sendMessage({ action: 'RESUME_TIMER' })
    if (response.success && response.state) setState(response.state)
    return response
  }, [])

  const stop = useCallback(async () => {
    const response = await sendMessage({ action: 'STOP_TIMER' })
    if (response.success && response.state) setState(response.state)
    return response
  }, [])

  // Idle actions
  const idleKeep = useCallback(async () => {
    const response = await sendMessage({ action: 'IDLE_KEEP' })
    if (response.success) {
      if (response.state) setState(response.state)
      if (response.idleInfo) setIdleInfo(response.idleInfo)
    }
    return response
  }, [])

  const idleDiscard = useCallback(async () => {
    const response = await sendMessage({ action: 'IDLE_DISCARD' })
    if (response.success) {
      if (response.state) setState(response.state)
      if (response.idleInfo) setIdleInfo(response.idleInfo)
    }
    return response
  }, [])

  // Pomodoro actions
  const startPomodoro = useCallback(async (projectId: string | null, description: string) => {
    const response = await sendMessage({
      action: 'START_POMODORO',
      payload: { projectId, description },
    })
    if (response.success) {
      if (response.state) setState(response.state)
      if (response.pomodoroState) setPomodoroState(response.pomodoroState)
    }
    return response
  }, [])

  const stopPomodoro = useCallback(async () => {
    const response = await sendMessage({ action: 'STOP_POMODORO' })
    if (response.success) {
      if (response.state) setState(response.state)
      setPomodoroState(DEFAULT_POMODORO)
    }
    return response
  }, [])

  const skipPhase = useCallback(async () => {
    const response = await sendMessage({ action: 'SKIP_POMODORO_PHASE' })
    if (response.success) {
      if (response.state) setState(response.state)
      if (response.pomodoroState) setPomodoroState(response.pomodoroState)
    }
    return response
  }, [])

  return {
    state,
    start, pause, resume, stop,
    idleInfo, idleKeep, idleDiscard,
    pomodoroState, startPomodoro, stopPomodoro, skipPhase,
    refetch: fetchState,
  }
}
