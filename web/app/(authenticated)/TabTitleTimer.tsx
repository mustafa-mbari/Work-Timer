'use client'

import { useEffect, useRef } from 'react'

const SESSION_KEY = 'wt-timer-state'

/**
 * Reads the timer session from sessionStorage and updates
 * document.title with a live HH:MM display while a stopwatch
 * or pomodoro is active. Placed in the authenticated layout
 * so it persists across page navigations.
 */
export default function TabTitleTimer() {
  const originalTitleRef = useRef<string | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval>>(null)

  useEffect(() => {
    function tick() {
      let raw: string | null = null
      try { raw = sessionStorage.getItem(SESSION_KEY) } catch { /* noop */ }

      if (!raw) {
        // No active timer — restore original title if we changed it
        if (originalTitleRef.current !== null) {
          document.title = originalTitleRef.current
          originalTitleRef.current = null
        }
        return
      }

      let session: {
        mode?: string
        swStatus?: string
        swStartTime?: number | null
        swElapsed?: number
        pomActive?: boolean
        pomPhase?: string
        pomPhaseStart?: number | null
        pomPhaseDuration?: number
      }
      try { session = JSON.parse(raw) } catch { return }

      const isSwActive = session.mode === 'stopwatch' && session.swStatus !== 'idle'
      const isPomActive = session.mode === 'pomodoro' && session.pomActive

      if (!isSwActive && !isPomActive) {
        if (originalTitleRef.current !== null) {
          document.title = originalTitleRef.current
          originalTitleRef.current = null
        }
        return
      }

      // Save the original title on first activation
      if (originalTitleRef.current === null) {
        originalTitleRef.current = document.title
      }

      let elapsed = 0
      if (isSwActive) {
        const base = session.swElapsed ?? 0
        elapsed = session.swStatus === 'running' && session.swStartTime
          ? base + (Date.now() - session.swStartTime)
          : base
      } else if (isPomActive && session.pomPhaseStart) {
        elapsed = Math.max(0, (session.pomPhaseDuration ?? 0) - (Date.now() - session.pomPhaseStart))
      }

      const totalSec = Math.floor(elapsed / 1000)
      const h = String(Math.floor(totalSec / 3600)).padStart(2, '0')
      const m = String(Math.floor((totalSec % 3600) / 60)).padStart(2, '0')
      const emoji = isPomActive ? '\uD83C\uDF45' : '\u23F1'
      document.title = `${h}:${m} ${emoji} \u2014 Work Timer`
    }

    // Run immediately, then every second
    tick()
    intervalRef.current = setInterval(tick, 1000)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
      if (originalTitleRef.current !== null) {
        document.title = originalTitleRef.current
        originalTitleRef.current = null
      }
    }
  }, [])

  return null
}
