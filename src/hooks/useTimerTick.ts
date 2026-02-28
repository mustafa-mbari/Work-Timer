import { useState, useEffect } from 'react'
import type { TimerState, PomodoroState } from '@/types'

/** Returns real-time elapsed ms, ticking every second while timer is running. */
export function useElapsed(state: TimerState): number {
  const [, tick] = useState(0)

  const isRunning = state.status === 'running'
  useEffect(() => {
    if (!isRunning) return
    const id = window.setInterval(() => tick(t => t + 1), 1000)
    return () => window.clearInterval(id)
  }, [isRunning])

  return isRunning && state.startTime
    ? state.elapsed + (Date.now() - state.startTime)
    : state.elapsed
}

/** Returns real-time pomodoro time remaining, ticking every second while active. */
export function usePomodoroRemaining(pom: PomodoroState): number {
  const [, tick] = useState(0)

  useEffect(() => {
    if (!pom.active) return
    const id = window.setInterval(() => tick(t => t + 1), 1000)
    return () => window.clearInterval(id)
  }, [pom.active])

  return pom.active && pom.phaseStartedAt
    ? Math.max(0, pom.phaseDuration - (Date.now() - pom.phaseStartedAt))
    : pom.phaseDuration
}
