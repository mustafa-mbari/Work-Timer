import { useState, useEffect, useCallback } from 'react'
import type { TimerState, TimerMessage, TimerResponse, IdleInfo, PomodoroState } from '@/types'

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
  phaseDuration: 25 * 60 * 1000,
  sessionsCompleted: 0,
  totalWorkTime: 0,
}

function sendMessage(message: TimerMessage): Promise<TimerResponse> {
  return chrome.runtime.sendMessage(message)
}

export function useTimer() {
  const [state, setState] = useState<TimerState>(DEFAULT_STATE)
  const [idleInfo, setIdleInfo] = useState<IdleInfo>(DEFAULT_IDLE)
  const [pomodoroState, setPomodoroState] = useState<PomodoroState>(DEFAULT_POMODORO)
  const [_tick, setTick] = useState(0) // Triggers re-renders for real-time display

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

  // Tick every second to trigger re-renders for real-time display
  useEffect(() => {
    fetchState()

    const interval = window.setInterval(() => setTick(t => t + 1), 1000)
    return () => window.clearInterval(interval)
  }, [fetchState])

  // Re-fetch real state periodically to stay in sync
  useEffect(() => {
    const sync = window.setInterval(fetchState, 5000)
    return () => window.clearInterval(sync)
  }, [fetchState])

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

  // Compute elapsed in real-time
  const now = Date.now()
  const elapsed = state.status === 'running' && state.startTime
    ? state.elapsed + (now - state.startTime)
    : state.elapsed

  // Compute pomodoro time remaining in real-time
  const pomodoroTimeRemaining = pomodoroState.active && pomodoroState.phaseStartedAt
    ? Math.max(0, pomodoroState.phaseDuration - (now - pomodoroState.phaseStartedAt))
    : pomodoroState.phaseDuration

  return {
    state, elapsed,
    start, pause, resume, stop,
    idleInfo, idleKeep, idleDiscard,
    pomodoroState, pomodoroTimeRemaining, startPomodoro, stopPomodoro, skipPhase,
    refetch: fetchState,
  }
}
