import { describe, it, expect, vi } from 'vitest'
import { getElapsed, DEFAULT_TIMER_STATE } from './timer'
import type { TimerState } from '../types'

describe('getElapsed', () => {
  it('returns 0 for idle state', () => {
    expect(getElapsed(DEFAULT_TIMER_STATE)).toBe(0)
  })

  it('returns accumulated elapsed for paused state', () => {
    const state: TimerState = {
      ...DEFAULT_TIMER_STATE,
      status: 'paused',
      elapsed: 5000,
      startTime: null,
      pausedAt: Date.now(),
    }
    expect(getElapsed(state)).toBe(5000)
  })

  it('computes running elapsed from startTime + accumulated', () => {
    const now = Date.now()
    vi.spyOn(Date, 'now').mockReturnValue(now + 3000)
    const state: TimerState = {
      ...DEFAULT_TIMER_STATE,
      status: 'running',
      startTime: now,
      elapsed: 2000, // previously accumulated
    }
    expect(getElapsed(state)).toBe(5000) // 2000 + 3000
    vi.restoreAllMocks()
  })

  it('returns elapsed when running but startTime is null', () => {
    const state: TimerState = {
      ...DEFAULT_TIMER_STATE,
      status: 'running',
      startTime: null,
      elapsed: 1000,
    }
    expect(getElapsed(state)).toBe(1000)
  })
})

describe('DEFAULT_TIMER_STATE', () => {
  it('has idle status with zero elapsed', () => {
    expect(DEFAULT_TIMER_STATE.status).toBe('idle')
    expect(DEFAULT_TIMER_STATE.elapsed).toBe(0)
    expect(DEFAULT_TIMER_STATE.startTime).toBeNull()
    expect(DEFAULT_TIMER_STATE.projectId).toBeNull()
    expect(DEFAULT_TIMER_STATE.description).toBe('')
  })
})
