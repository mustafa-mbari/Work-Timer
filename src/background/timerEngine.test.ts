/**
 * Integration tests for the timer engine (start → pause → resume → stop flow).
 *
 * These test the timer lifecycle through timerEngine functions, which
 * interact with chrome.storage.local (mocked in setup.ts) and various
 * Chrome APIs (mocked below).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { seedStore, getStore } from '../__tests__/setup'
import type { TimerState } from '../types'

// ── Mock additional Chrome APIs that timerEngine and its dependencies use ──

const chromeMock = globalThis.chrome as Record<string, unknown>

// chrome.alarms
chromeMock.alarms = {
  create: vi.fn(),
  clear: vi.fn(),
}

// chrome.idle
chromeMock.idle = {
  setDetectionInterval: vi.fn(),
}

// chrome.action (badge)
chromeMock.action = {
  setBadgeText: vi.fn(),
  setBadgeBackgroundColor: vi.fn(),
}

// chrome.runtime (for broadcastTimerSync)
chromeMock.runtime = {
  sendMessage: vi.fn().mockResolvedValue(undefined),
}

// chrome.tabs (for broadcastTimerSync)
chromeMock.tabs = {
  sendMessage: vi.fn().mockResolvedValue(undefined),
  query: vi.fn().mockResolvedValue([]),
}

// Reset all Chrome API mocks between tests
beforeEach(() => {
  vi.mocked(chromeMock.alarms as { create: ReturnType<typeof vi.fn>; clear: ReturnType<typeof vi.fn> }).create.mockReset()
  vi.mocked(chromeMock.alarms as { create: ReturnType<typeof vi.fn>; clear: ReturnType<typeof vi.fn> }).clear.mockReset()
  vi.mocked(chromeMock.idle as { setDetectionInterval: ReturnType<typeof vi.fn> }).setDetectionInterval.mockReset()
  vi.mocked(chromeMock.action as { setBadgeText: ReturnType<typeof vi.fn> }).setBadgeText.mockReset()
  vi.mocked(chromeMock.action as { setBadgeBackgroundColor: ReturnType<typeof vi.fn> }).setBadgeBackgroundColor.mockReset()
  vi.mocked(chromeMock.runtime as { sendMessage: ReturnType<typeof vi.fn> }).sendMessage.mockReset().mockResolvedValue(undefined)
  vi.mocked(chromeMock.tabs as { sendMessage: ReturnType<typeof vi.fn> }).sendMessage.mockReset().mockResolvedValue(undefined)
  vi.mocked(chromeMock.tabs as { query: ReturnType<typeof vi.fn> }).query.mockReset().mockResolvedValue([])
})

// Import after all mocks are in place
import { startTimer, pauseTimer, resumeTimer, stopTimer } from './timerEngine'

// ── Tests ──

describe('Timer Engine — full lifecycle', () => {
  it('startTimer sets running state', async () => {
    const result = await startTimer('proj-1', 'Working on feature')
    expect(result.success).toBe(true)
    expect(result.state?.status).toBe('running')
    expect(result.state?.projectId).toBe('proj-1')
    expect(result.state?.description).toBe('Working on feature')
    expect(result.state?.startTime).toBeGreaterThan(0)
  })

  it('startTimer persists state to storage', async () => {
    await startTimer('proj-1', 'Task')
    const store = getStore()
    const state = store['timerState'] as TimerState
    expect(state.status).toBe('running')
  })

  it('startTimer sets idle detection interval from settings', async () => {
    seedStore({ settings: { idleTimeout: 10 } })
    await startTimer(null, '')
    const idle = chromeMock.idle as { setDetectionInterval: ReturnType<typeof vi.fn> }
    expect(idle.setDetectionInterval).toHaveBeenCalledWith(600) // 10 * 60
  })

  it('startTimer updates badge', async () => {
    await startTimer(null, '')
    const action = chromeMock.action as { setBadgeText: ReturnType<typeof vi.fn> }
    expect(action.setBadgeText).toHaveBeenCalled()
  })

  it('startTimer removes floatingTimerHidden flag', async () => {
    seedStore({ floatingTimerHidden: true })
    await startTimer(null, '')
    const store = getStore()
    expect(store['floatingTimerHidden']).toBeUndefined()
  })
})

describe('Timer Engine — pause', () => {
  it('pauseTimer snapshots elapsed time', async () => {
    const now = Date.now()
    vi.spyOn(Date, 'now').mockReturnValue(now)
    await startTimer(null, 'Test')

    // Advance time by 5 seconds
    vi.spyOn(Date, 'now').mockReturnValue(now + 5000)
    const result = await pauseTimer()

    expect(result.success).toBe(true)
    expect(result.state?.status).toBe('paused')
    expect(result.state?.elapsed).toBe(5000)
    expect(result.state?.startTime).toBeNull()
    expect(result.state?.pausedAt).toBe(now + 5000)
    vi.restoreAllMocks()
  })

  it('pauseTimer fails when not running', async () => {
    const result = await pauseTimer()
    expect(result.success).toBe(false)
    expect(result.error).toBeDefined()
  })

  it('pauseTimer clears timer alarm', async () => {
    await startTimer(null, '')
    await pauseTimer()
    const alarms = chromeMock.alarms as { clear: ReturnType<typeof vi.fn> }
    expect(alarms.clear).toHaveBeenCalledWith('timer-tick')
  })
})

describe('Timer Engine — resume', () => {
  it('resumeTimer sets running with new startTime', async () => {
    await startTimer(null, '')
    await pauseTimer()
    const result = await resumeTimer()

    expect(result.success).toBe(true)
    expect(result.state?.status).toBe('running')
    expect(result.state?.startTime).toBeGreaterThan(0)
    expect(result.state?.pausedAt).toBeNull()
  })

  it('resumeTimer preserves accumulated elapsed', async () => {
    const now = Date.now()
    vi.spyOn(Date, 'now').mockReturnValue(now)
    await startTimer(null, '')

    vi.spyOn(Date, 'now').mockReturnValue(now + 3000)
    await pauseTimer()

    vi.spyOn(Date, 'now').mockReturnValue(now + 10000)
    const result = await resumeTimer()

    // Elapsed should be 3000ms (accumulated during first run)
    expect(result.state?.elapsed).toBe(3000)
    vi.restoreAllMocks()
  })

  it('resumeTimer fails when not paused', async () => {
    const result = await resumeTimer()
    expect(result.success).toBe(false)
  })
})

describe('Timer Engine — stop', () => {
  it('stopTimer creates an entry and resets state', async () => {
    const now = Date.now()
    vi.spyOn(Date, 'now').mockReturnValue(now)
    await startTimer('proj-1', 'Feature work')

    // Advance time by 30 seconds (above default 10s threshold)
    vi.spyOn(Date, 'now').mockReturnValue(now + 30000)
    const result = await stopTimer()

    expect(result.success).toBe(true)
    expect(result.state?.status).toBe('idle')
    expect(result.entry).toBeDefined()
    expect(result.entry?.duration).toBe(30000)
    expect(result.entry?.projectId).toBe('proj-1')
    expect(result.entry?.description).toBe('Feature work')
    expect(result.entry?.type).toBe('stopwatch')
    expect(result.discarded).toBeUndefined()
    vi.restoreAllMocks()
  })

  it('stopTimer discards entry shorter than save threshold', async () => {
    const now = Date.now()
    vi.spyOn(Date, 'now').mockReturnValue(now)
    await startTimer(null, '')

    // Only 3 seconds — below default 10s threshold
    vi.spyOn(Date, 'now').mockReturnValue(now + 3000)
    const result = await stopTimer()

    expect(result.success).toBe(true)
    expect(result.discarded).toBe(true)
    expect(result.entry).toBeUndefined()
    vi.restoreAllMocks()
  })

  it('stopTimer respects custom entrySaveTime setting', async () => {
    seedStore({ settings: { entrySaveTime: 5 } }) // 5 second threshold
    const now = Date.now()
    vi.spyOn(Date, 'now').mockReturnValue(now)
    await startTimer(null, '')

    // 6 seconds — above 5s threshold
    vi.spyOn(Date, 'now').mockReturnValue(now + 6000)
    const result = await stopTimer()

    expect(result.success).toBe(true)
    expect(result.discarded).toBeUndefined()
    expect(result.entry).toBeDefined()
    vi.restoreAllMocks()
  })

  it('stopTimer fails when idle', async () => {
    const result = await stopTimer()
    expect(result.success).toBe(false)
  })

  it('stopTimer resets badge to empty', async () => {
    const now = Date.now()
    vi.spyOn(Date, 'now').mockReturnValue(now)
    await startTimer(null, '')
    vi.spyOn(Date, 'now').mockReturnValue(now + 30000)
    await stopTimer()

    const action = chromeMock.action as { setBadgeText: ReturnType<typeof vi.fn> }
    const lastCall = action.setBadgeText.mock.calls.at(-1)
    expect(lastCall?.[0]).toEqual({ text: '' })
    vi.restoreAllMocks()
  })

  it('stopTimer persists entry to storage under date key', async () => {
    const now = Date.now()
    vi.spyOn(Date, 'now').mockReturnValue(now)
    await startTimer(null, 'Test')
    vi.spyOn(Date, 'now').mockReturnValue(now + 30000)
    const result = await stopTimer()

    const store = getStore()
    const date = result.entry?.date
    expect(date).toBeDefined()
    const entries = store[`entries_${date}`] as unknown[]
    expect(entries).toHaveLength(1)
    vi.restoreAllMocks()
  })
})

describe('Timer Engine — full start→pause→resume→stop cycle', () => {
  it('accumulates elapsed across pause/resume', async () => {
    const now = Date.now()
    vi.spyOn(Date, 'now').mockReturnValue(now)

    // Start
    await startTimer(null, 'Cycle test')

    // Run for 10s, then pause
    vi.spyOn(Date, 'now').mockReturnValue(now + 10000)
    await pauseTimer()

    // Wait 5s (paused — not counted)
    vi.spyOn(Date, 'now').mockReturnValue(now + 15000)
    await resumeTimer()

    // Run for 20s more, then stop
    vi.spyOn(Date, 'now').mockReturnValue(now + 35000)
    const result = await stopTimer()

    // Total elapsed: 10s + 20s = 30s (pause gap not counted)
    expect(result.entry?.duration).toBe(30000)
    vi.restoreAllMocks()
  })
})
