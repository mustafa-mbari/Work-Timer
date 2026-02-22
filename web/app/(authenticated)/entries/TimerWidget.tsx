'use client'

import { useState, useEffect, useRef, useMemo, useCallback, memo, Fragment, type ReactNode } from 'react'
import { toast } from 'sonner'
import { Timer, Pencil, Play, Pause, Square, SkipForward, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { ProjectSummary } from '@/lib/repositories/projects'
import type { TagSummary } from '@/lib/repositories/tags'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'

// ─── Types ───────────────────────────────────────────────────────────────────

type Mode = 'stopwatch' | 'manual' | 'pomodoro'
type TimerStatus = 'idle' | 'running' | 'paused'
type PomPhase = 'work' | 'shortBreak' | 'longBreak'
type InputType = 'duration' | 'timeRange'

interface PomodoroConfig {
  workMinutes: number
  shortBreakMinutes: number
  longBreakMinutes: number
  sessionsBeforeLongBreak: number
}

interface Props {
  projects: ProjectSummary[]
  tags: TagSummary[]
  pomodoroConfig: PomodoroConfig
  dailyTargetHours: number
  todayTotalMs: number
  entrySaveTime: number
  onEntrySaved: () => void
}

const DEFAULT_POM: PomodoroConfig = {
  workMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  sessionsBeforeLongBreak: 4,
}

function formatThreshold(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return s > 0 ? `${m}m ${s}s` : `${m}m`
}

// ─── Session Storage ─────────────────────────────────────────────────────────

const SESSION_KEY = 'wt-timer-state'

interface TimerSession {
  mode: Mode
  projectId: string
  description: string
  selectedTagId: string
  link: string
  swStatus: TimerStatus
  swStartTime: number | null
  swElapsed: number
  swRealStart: number | null
  pomActive: boolean
  pomPhase: PomPhase
  pomPhaseStart: number | null
  pomPhaseDuration: number
  pomSessions: number
  pomTotalWork: number
  pomWorkStart: number | null
  pomRemainingWork: number
  pomAccumWork: number
}

function loadSession(): TimerSession | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(SESSION_KEY)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

function saveSession(state: TimerSession) {
  try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(state)) } catch {}
}

function clearSession() {
  try { sessionStorage.removeItem(SESSION_KEY) } catch {}
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatMmSs(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000))
  return `${String(Math.floor(totalSec / 60)).padStart(2, '0')}:${String(totalSec % 60).padStart(2, '0')}`
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10)
}

function formatDurationShort(ms: number): string {
  const totalMin = Math.round(ms / 60000)
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

function pomProgressToColor(t: number): string {
  const c: [number, number, number][] = [
    [239, 68, 68], [249, 115, 22], [234, 179, 8], [132, 204, 22], [34, 197, 94],
  ]
  const s = Math.max(0, Math.min(1, t)) * (c.length - 1)
  const lo = Math.floor(s)
  const hi = Math.min(lo + 1, c.length - 1)
  const f = s - lo
  return `rgb(${Math.round(c[lo][0] + (c[hi][0] - c[lo][0]) * f)},${Math.round(c[lo][1] + (c[hi][1] - c[lo][1]) * f)},${Math.round(c[lo][2] + (c[hi][2] - c[lo][2]) * f)})`
}

// ─── Rolling Timer ───────────────────────────────────────────────────────────

const DIGIT_H = 64
const DIGIT_W = 36
const FONT_STYLE = { fontFamily: "'Inter Variable', 'Roboto', system-ui, sans-serif" }

const RollingDigit = memo(function RollingDigit({ value, maxDigit = 9 }: { value: number; maxDigit?: number }) {
  const prevRef = useRef(value)
  const [offset, setOffset] = useState(value)
  const [shouldAnimate, setShouldAnimate] = useState(false)

  useEffect(() => {
    const prev = prevRef.current
    prevRef.current = value
    if (prev === value) return

    if (value < prev) {
      setShouldAnimate(true)
      setOffset(maxDigit + 1)
      const t = setTimeout(() => {
        setShouldAnimate(false)
        setOffset(value)
      }, 300)
      return () => clearTimeout(t)
    }

    setShouldAnimate(true)
    setOffset(value)
  }, [value, maxDigit])

  const digits = [...Array.from({ length: maxDigit + 1 }, (_, i) => i), 0]

  return (
    <div className="relative overflow-hidden" style={{ height: DIGIT_H, width: DIGIT_W }}>
      <div
        style={{
          transform: `translateY(-${offset * DIGIT_H}px)`,
          transition: shouldAnimate ? 'transform 300ms cubic-bezier(0.4, 0, 0.2, 1)' : 'none',
        }}
      >
        {digits.map((d, i) => (
          <div key={i} className="flex items-center justify-center" style={{ height: DIGIT_H }}>
            <span
              className="text-[46px] font-semibold leading-none text-stone-900 dark:text-white"
              style={FONT_STYLE}
            >
              {d}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
})

function RollingTimerDisplay({ elapsed }: { elapsed: number }) {
  const totalSeconds = Math.floor(elapsed / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  const groups = [
    { tens: Math.floor(hours / 10), ones: hours % 10, tensMax: 9 },
    { tens: Math.floor(minutes / 10), ones: minutes % 10, tensMax: 5 },
    { tens: Math.floor(seconds / 10), ones: seconds % 10, tensMax: 5 },
  ]

  const h = String(hours).padStart(2, '0')
  const m = String(minutes).padStart(2, '0')
  const s = String(seconds).padStart(2, '0')

  return (
    <div
      className="flex items-center justify-center gap-2.5"
      role="timer"
      aria-live="polite"
      aria-label={`Timer: ${h}:${m}:${s}`}
    >
      {groups.map((g, gi) => (
        <Fragment key={gi}>
          {gi > 0 && (
            <span
              className="text-2xl font-semibold leading-none text-stone-400 dark:text-stone-500"
              style={FONT_STYLE}
            >
              :
            </span>
          )}
          <div className="relative flex rolling-face rounded-xl overflow-hidden px-1">
            <RollingDigit value={g.tens} maxDigit={g.tensMax} />
            <RollingDigit value={g.ones} maxDigit={9} />
            <div className="absolute inset-0 pointer-events-none z-10 rolling-face-gradient" />
          </div>
        </Fragment>
      ))}
    </div>
  )
}

// ─── Shared inputs panel ─────────────────────────────────────────────────────

const smallInputClass =
  'w-full border border-stone-200 dark:border-[var(--dark-border)] bg-white dark:bg-[var(--dark-card)] text-stone-900 dark:text-stone-100 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500'

interface InputsPanelProps {
  projects: ProjectSummary[]
  tags: TagSummary[]
  projectId: string
  selectedTagId: string
  description: string
  link: string
  onProjectChange: (v: string) => void
  onTagChange: (v: string) => void
  onDescriptionChange: (v: string) => void
  onLinkChange: (v: string) => void
}

function InputsPanel({
  projects, tags, projectId, selectedTagId, description, link,
  onProjectChange, onTagChange, onDescriptionChange, onLinkChange,
}: InputsPanelProps) {
  return (
    <div className="flex flex-col gap-2">
      {/* Row 1: Project + Tag side by side */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[10px] font-medium text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-1 block">Project</label>
          <Select
            value={projectId || '__none__'}
            onValueChange={v => onProjectChange(v === '__none__' ? '' : v)}
          >
            <SelectTrigger className="h-8 text-xs [&>span]:text-xs">
              <SelectValue placeholder="No project" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">
                <span className="text-stone-400">No project</span>
              </SelectItem>
              {projects.filter(p => !p.archived).map(p => (
                <SelectItem key={p.id} value={p.id}>
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: p.color }}
                    />
                    {p.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-[10px] font-medium text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-1 block">Tag</label>
          <select
            value={selectedTagId}
            onChange={e => onTagChange(e.target.value)}
            className={`${smallInputClass} h-8`}
            aria-label="Select tag"
          >
            <option value="">No tag</option>
            {tags.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Row 2: Description */}
      <div>
        <label className="text-[10px] font-medium text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-1 block">Description</label>
        <input
          type="text"
          placeholder="What are you working on?"
          value={description}
          onChange={e => onDescriptionChange(e.target.value)}
          className={`${smallInputClass} placeholder:text-stone-400 dark:placeholder:text-stone-600`}
          aria-label="Task description"
        />
      </div>

      {/* Row 3: Link */}
      <div>
        <label className="text-[10px] font-medium text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-1 block">Link</label>
        <input
          type="url"
          placeholder="https://..."
          value={link}
          onChange={e => onLinkChange(e.target.value)}
          className={`${smallInputClass} placeholder:text-stone-400 dark:placeholder:text-stone-600`}
          aria-label="Link URL"
        />
      </div>
    </div>
  )
}

// ─── Daily Goal Gauge ────────────────────────────────────────────────────────

const GAUGE_SEGMENTS = 10
const GAUGE_COLORS = ['#B12B1D', '#B1671E', '#B19719', '#7BB11B', '#16B13D']

function interpolateGaugeColor(t: number): string {
  const pos = Math.max(0, Math.min(1, t)) * (GAUGE_COLORS.length - 1)
  const lo = Math.floor(pos)
  const hi = Math.min(lo + 1, GAUGE_COLORS.length - 1)
  const f = pos - lo
  const c1 = parseInt(GAUGE_COLORS[lo].slice(1), 16)
  const c2 = parseInt(GAUGE_COLORS[hi].slice(1), 16)
  const r = Math.round(((c1 >> 16) & 0xff) + (((c2 >> 16) & 0xff) - ((c1 >> 16) & 0xff)) * f)
  const g = Math.round(((c1 >> 8) & 0xff) + (((c2 >> 8) & 0xff) - ((c1 >> 8) & 0xff)) * f)
  const b = Math.round((c1 & 0xff) + ((c2 & 0xff) - (c1 & 0xff)) * f)
  return `rgb(${r},${g},${b})`
}

function DailyGoalGauge({ percentage, todayHours, targetHours }: { percentage: number; todayHours: string; targetHours: number }) {
  const filled = Math.round(Math.min(100, Math.max(0, percentage)) / 100 * GAUGE_SEGMENTS)
  const cx = 100, cy = 100, radius = 72
  const segW = 18, segH = 34, segRx = 6

  return (
    <div className="flex flex-col items-center justify-center h-full w-full">
      <div className="relative w-full flex justify-center">
        <svg viewBox="0 0 200 120" className="w-full max-w-[240px] text-stone-900 dark:text-stone-100">
          {Array.from({ length: GAUGE_SEGMENTS }).map((_, i) => {
            const angleDeg = 180 - i * (180 / (GAUGE_SEGMENTS - 1))
            const angleRad = angleDeg * Math.PI / 180
            const x = cx + radius * Math.cos(angleRad)
            const y = cy - radius * Math.sin(angleRad)
            const rotation = 90 - angleDeg

            return (
              <rect
                key={i}
                x={x - segW / 2}
                y={y - segH / 2}
                width={segW}
                height={segH}
                rx={segRx}
                style={i < filled ? { fill: interpolateGaugeColor(i / (GAUGE_SEGMENTS - 1)) } : undefined}
                className={i >= filled ? 'fill-stone-200 dark:fill-stone-700' : ''}
                transform={`rotate(${rotation}, ${x}, ${y})`}
              />
            )
          })}
          <text x="100" y="96" textAnchor="middle" dominantBaseline="middle"
            fill="currentColor" style={{ fontSize: 30, fontWeight: 700 }}>
            {Math.round(percentage)}%
          </text>
        </svg>
      </div>
      <div className="text-center mt-1">
        <div className="text-[10px] font-medium text-stone-500 dark:text-stone-400 uppercase tracking-wider">
          Daily Goal
        </div>
        <div className="text-xs text-stone-400 dark:text-stone-500 mt-0.5">
          {todayHours} / {targetHours}h
        </div>
      </div>
    </div>
  )
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function TimerWidget({ projects, tags, pomodoroConfig, dailyTargetHours, todayTotalMs, entrySaveTime, onEntrySaved }: Props) {
  const pom = { ...DEFAULT_POM, ...pomodoroConfig }

  // ── Restore from session storage (runs once on mount) ──
  const savedRef = useRef<TimerSession | null | undefined>(undefined)
  if (savedRef.current === undefined) {
    savedRef.current = typeof window !== 'undefined' ? loadSession() : null
  }
  const saved = savedRef.current

  // Common state
  const [mode, setMode] = useState<Mode>(saved?.mode ?? 'stopwatch')
  const [projectId, setProjectId] = useState(saved?.projectId ?? '')
  const [description, setDescription] = useState(saved?.description ?? '')
  const [selectedTagId, setSelectedTagId] = useState(saved?.selectedTagId ?? '')
  const [link, setLink] = useState(saved?.link ?? '')

  // ── Stopwatch state ──
  const [swStatus, setSwStatus] = useState<TimerStatus>(saved?.swStatus ?? 'idle')
  const [swStartTime, setSwStartTime] = useState<number | null>(saved?.swStartTime ?? null)
  const [swElapsed, setSwElapsed] = useState(saved?.swElapsed ?? 0)
  const [swTick, setSwTick] = useState(0)
  const swTickRef = useRef<ReturnType<typeof setInterval>>(null)
  const swRealStartRef = useRef<number | null>(saved?.swRealStart ?? null)

  // ── Manual state ──
  const [manualDate, setManualDate] = useState(todayStr())
  const [manualInputType, setManualInputType] = useState<InputType>('duration')
  const [manualFrom, setManualFrom] = useState('')
  const [manualTo, setManualTo] = useState('')
  const [manualHours, setManualHours] = useState(0)
  const [manualMinutes, setManualMinutes] = useState(0)

  // ── Pomodoro state ──
  const [pomActive, setPomActive] = useState(saved?.pomActive ?? false)
  const [pomPhase, setPomPhase] = useState<PomPhase>(saved?.pomPhase ?? 'work')
  const [pomPhaseStart, setPomPhaseStart] = useState<number | null>(saved?.pomPhaseStart ?? null)
  const [pomPhaseDuration, setPomPhaseDuration] = useState(saved?.pomPhaseDuration ?? pom.workMinutes * 60 * 1000)
  const [pomSessions, setPomSessions] = useState(saved?.pomSessions ?? 0)
  const [pomTotalWork, setPomTotalWork] = useState(saved?.pomTotalWork ?? 0)
  const [pomTick, setPomTick] = useState(0)
  const pomTickRef = useRef<ReturnType<typeof setInterval>>(null)
  const pomWorkStartRef = useRef<number | null>(saved?.pomWorkStart ?? null)
  // Remaining work time (ms) when user manually skips to break early; 0 = next session is fresh
  const [pomRemainingWork, setPomRemainingWork] = useState(saved?.pomRemainingWork ?? 0)
  // Accumulated work time (ms) across resume(s) within one logical session; saved as entry when session completes
  const [pomAccumWork, setPomAccumWork] = useState(saved?.pomAccumWork ?? 0)

  const [saving, setSaving] = useState(false)
  const [discardAlert, setDiscardAlert] = useState<string | null>(null)
  const discardTimerRef = useRef<ReturnType<typeof setTimeout>>(null)

  // Auto-select default project (only if no saved/selected project)
  useEffect(() => {
    if (projectId) return
    const defaultProject = projects.find(p => 'is_default' in p && (p as any).is_default && !p.archived)
    if (defaultProject) {
      setProjectId(defaultProject.id)
    }
  }, [projects]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Save to session storage on relevant state changes ──
  useEffect(() => {
    if (swStatus !== 'idle' || pomActive) {
      saveSession({
        mode, projectId, description, selectedTagId, link,
        swStatus, swStartTime, swElapsed, swRealStart: swRealStartRef.current,
        pomActive, pomPhase, pomPhaseStart, pomPhaseDuration, pomSessions, pomTotalWork,
        pomWorkStart: pomWorkStartRef.current,
        pomRemainingWork, pomAccumWork,
      })
    } else {
      clearSession()
    }
  }, [mode, projectId, description, selectedTagId, link, swStatus, swStartTime, swElapsed, pomActive, pomPhase, pomPhaseStart, pomPhaseDuration, pomSessions, pomTotalWork, pomRemainingWork, pomAccumWork])

  // ── Computed values (NO useMemo — must recalculate on every tick render) ──
  const swCurrentElapsed = (swStatus === 'running' && swStartTime)
    ? swElapsed + (Date.now() - swStartTime)
    : swElapsed

  const pomTimeRemaining = (pomActive && pomPhaseStart)
    ? Math.max(0, pomPhaseDuration - (Date.now() - pomPhaseStart))
    : pomPhaseDuration

  const pomProgress = pomActive && pomPhaseDuration > 0
    ? 1 - pomTimeRemaining / pomPhaseDuration
    : 0

  const isWorkPhase = pomPhase === 'work'
  const pomAccent = isWorkPhase
    ? pomProgressToColor(pomProgress)
    : pomProgressToColor(1 - pomProgress)

  const manualDuration = useMemo(() => {
    if (manualInputType === 'timeRange' && manualFrom && manualTo) {
      const [fh, fm] = manualFrom.split(':').map(Number)
      const [th, tm] = manualTo.split(':').map(Number)
      const mins = (th * 60 + tm) - (fh * 60 + fm)
      return mins > 0 ? mins * 60 * 1000 : 0
    }
    return (manualHours * 60 + manualMinutes) * 60 * 1000
  }, [manualInputType, manualFrom, manualTo, manualHours, manualMinutes])

  const isActive = swStatus !== 'idle' || pomActive

  // Suppress unused-variable warnings for tick counters (they exist to force re-renders)
  void swTick
  void pomTick

  // ── Tick effects ──
  useEffect(() => {
    if (swStatus === 'running') {
      swTickRef.current = setInterval(() => setSwTick(t => t + 1), 1000)
    } else {
      if (swTickRef.current) clearInterval(swTickRef.current)
    }
    return () => { if (swTickRef.current) clearInterval(swTickRef.current) }
  }, [swStatus])

  useEffect(() => {
    if (pomActive) {
      pomTickRef.current = setInterval(() => {
        setPomTick(t => t + 1)
        if (pomPhaseStart && Date.now() - pomPhaseStart >= pomPhaseDuration) {
          advancePomPhase()
        }
      }, 500)
    } else {
      if (pomTickRef.current) clearInterval(pomTickRef.current)
    }
    return () => { if (pomTickRef.current) clearInterval(pomTickRef.current) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pomActive, pomPhaseStart, pomPhaseDuration])

  // ── API helper ──
  const createEntry = useCallback(async (params: {
    duration: number
    type: 'stopwatch' | 'manual' | 'pomodoro'
    startTime: number
    endTime: number
  }) => {
    setSaving(true)
    try {
      const body = {
        id: crypto.randomUUID(),
        date: new Date(params.startTime).toISOString().slice(0, 10),
        start_time: params.startTime,
        end_time: params.endTime,
        duration: params.duration,
        type: params.type,
        project_id: projectId || null,
        task_id: null,
        description: description.trim(),
        tags: selectedTagId ? [selectedTagId] : [],
        link: link.trim() || null,
      }

      const res = await fetch('/api/entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const data = await res.json()
        toast.error(data.error ?? 'Failed to save entry')
        return
      }

      toast.success('Entry saved')
      onEntrySaved()
    } catch {
      toast.error('Network error')
    } finally {
      setSaving(false)
    }
  }, [projectId, description, selectedTagId, link, onEntrySaved])

  // ── Stopwatch controls ──
  function swStart() {
    const now = Date.now()
    setSwStartTime(now)
    setSwElapsed(0)
    setSwStatus('running')
    swRealStartRef.current = now
  }

  function swPause() {
    if (swStartTime) {
      setSwElapsed(prev => prev + (Date.now() - swStartTime))
    }
    setSwStartTime(null)
    setSwStatus('paused')
  }

  function swResume() {
    setSwStartTime(Date.now())
    setSwStatus('running')
  }

  function showDiscardAlert(durationLabel: string) {
    if (discardTimerRef.current) clearTimeout(discardTimerRef.current)
    setDiscardAlert(`Entry discarded: duration was less than ${durationLabel}. You can change this in Settings → Time Tracking.`)
    discardTimerRef.current = setTimeout(() => setDiscardAlert(null), 6000)
  }

  async function swStop() {
    const now = Date.now()
    let total = swElapsed
    if (swStartTime) total += now - swStartTime

    const thresholdMs = entrySaveTime * 1000
    if (total < thresholdMs) {
      setSwStatus('idle')
      setSwStartTime(null)
      setSwElapsed(0)
      swRealStartRef.current = null
      if (total >= 1000) showDiscardAlert(formatThreshold(entrySaveTime))
      return
    }

    const realStart = swRealStartRef.current ?? (now - total)
    await createEntry({ duration: total, type: 'stopwatch', startTime: realStart, endTime: now })

    setSwStatus('idle')
    setSwStartTime(null)
    setSwElapsed(0)
    swRealStartRef.current = null
    setDescription('')
    setSelectedTagId('')
    setLink('')
  }

  // ── Manual save ──
  async function manualSave() {
    if (manualDuration <= 0) return
    const thresholdMs = entrySaveTime * 1000
    if (manualDuration < thresholdMs) {
      showDiscardAlert(formatThreshold(entrySaveTime))
      return
    }
    let startMs: number, endMs: number
    if (manualInputType === 'timeRange' && manualFrom && manualTo) {
      startMs = new Date(`${manualDate}T${manualFrom}:00`).getTime()
      endMs = new Date(`${manualDate}T${manualTo}:00`).getTime()
    } else {
      endMs = Date.now()
      startMs = endMs - manualDuration
    }
    await createEntry({ duration: manualDuration, type: 'manual', startTime: startMs, endTime: endMs })
    setManualDate(todayStr())
    setManualFrom('')
    setManualTo('')
    setManualHours(0)
    setManualMinutes(0)
    setDescription('')
    setSelectedTagId('')
    setLink('')
  }

  // ── Pomodoro controls ──
  function pomStart() {
    const dur = pom.workMinutes * 60 * 1000
    setPomPhase('work')
    setPomPhaseDuration(dur)
    setPomPhaseStart(Date.now())
    setPomActive(true)
    setPomSessions(0)
    setPomTotalWork(0)
    setPomRemainingWork(0)
    setPomAccumWork(0)
    pomWorkStartRef.current = Date.now()
  }

  function advancePomPhase() {
    const now = Date.now()
    if (pomPhase === 'work') {
      const workDur = pomPhaseStart ? now - pomPhaseStart : 0
      const remaining = Math.max(0, pomPhaseDuration - workDur)
      const totalAccum = pomAccumWork + workDur

      setPomTotalWork(prev => prev + workDur)

      if (remaining <= 1000) {
        // Natural completion — save entry with total accumulated work time
        const thresholdMs = entrySaveTime * 1000
        if (totalAccum >= thresholdMs) {
          const start = pomWorkStartRef.current ?? (now - totalAccum)
          createEntry({ duration: totalAccum, type: 'pomodoro', startTime: start, endTime: now })
        }
        const newSessions = pomSessions + 1
        setPomSessions(newSessions)
        setPomAccumWork(0)
        setPomRemainingWork(0)
        const isLongBreak = newSessions % pom.sessionsBeforeLongBreak === 0
        const breakPhase: PomPhase = isLongBreak ? 'longBreak' : 'shortBreak'
        const breakDur = (isLongBreak ? pom.longBreakMinutes : pom.shortBreakMinutes) * 60 * 1000
        setPomPhase(breakPhase)
        setPomPhaseDuration(breakDur)
        setPomPhaseStart(now)
      } else {
        // Manual skip — don't save entry yet, accumulate work time for later
        setPomAccumWork(totalAccum)
        setPomRemainingWork(remaining)
        const breakDur = pom.shortBreakMinutes * 60 * 1000
        setPomPhase('shortBreak')
        setPomPhaseDuration(breakDur)
        setPomPhaseStart(now)
      }
    } else {
      // Break ended — resume remaining work or start fresh session
      const workDur = pomRemainingWork > 0 ? pomRemainingWork : pom.workMinutes * 60 * 1000
      setPomPhase('work')
      setPomPhaseDuration(workDur)
      setPomPhaseStart(now)
      if (pomRemainingWork <= 0) {
        // Fresh session — reset work start ref
        pomWorkStartRef.current = now
      }
      setPomRemainingWork(0)
    }
  }

  async function pomStop() {
    const now = Date.now()
    if (pomPhase === 'work' && pomPhaseStart) {
      const worked = now - pomPhaseStart
      const totalAccum = pomAccumWork + worked
      const thresholdMs = entrySaveTime * 1000
      if (totalAccum >= thresholdMs) {
        const start = pomWorkStartRef.current ?? (now - totalAccum)
        await createEntry({ duration: totalAccum, type: 'pomodoro', startTime: start, endTime: now })
      } else if (totalAccum >= 1000) {
        showDiscardAlert(formatThreshold(entrySaveTime))
      }
    } else if (pomAccumWork > 0) {
      // Stopped during break but had accumulated work from earlier segments
      const thresholdMs = entrySaveTime * 1000
      if (pomAccumWork >= thresholdMs) {
        const start = pomWorkStartRef.current ?? (now - pomAccumWork)
        await createEntry({ duration: pomAccumWork, type: 'pomodoro', startTime: start, endTime: now })
      } else if (pomAccumWork >= 1000) {
        showDiscardAlert(formatThreshold(entrySaveTime))
      }
    }
    setPomActive(false)
    setPomPhaseStart(null)
    setPomPhase('work')
    setPomSessions(0)
    setPomTotalWork(0)
    setPomRemainingWork(0)
    setPomAccumWork(0)
    pomWorkStartRef.current = null
    setDescription('')
    setSelectedTagId('')
    setLink('')
  }

  // ── Styles ──
  const toggleBtn = (active: boolean) =>
    `text-[11px] font-medium px-2.5 py-1 rounded-md transition-all ${
      active
        ? 'bg-white dark:bg-[var(--dark-card)] text-stone-900 dark:text-stone-100 shadow-sm'
        : 'text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-300'
    }`
  const stepperBtn =
    'w-8 h-8 rounded-full border-2 border-stone-300 dark:border-stone-600 bg-white dark:bg-[var(--dark-elevated)] text-stone-400 dark:text-stone-500 flex items-center justify-center hover:border-indigo-400 hover:text-indigo-500 dark:hover:border-indigo-400 dark:hover:text-indigo-400 transition-colors active:scale-95 text-base leading-none select-none'

  // ── Pomodoro ring ──
  function renderPomRing() {
    const r = 40, ox = 60, oy = 60, N = 60
    const totalDeg = pomProgress * 360
    const segs: ReactNode[] = []

    if (pomActive && pomProgress > 0) {
      for (let i = 0; i < N; i++) {
        const startDeg = (i / N) * 360
        if (startDeg >= totalDeg) break
        const endDeg = Math.min(((i + 1) / N) * 360, totalDeg)
        const t = (i + 0.5) / N
        const color = isWorkPhase ? pomProgressToColor(t) : pomProgressToColor(1 - t)
        const s = (startDeg - 90) * Math.PI / 180
        const e = (endDeg - 90) * Math.PI / 180
        segs.push(
          <path key={i}
            d={`M ${(ox + r * Math.cos(s)).toFixed(3)} ${(oy + r * Math.sin(s)).toFixed(3)} A ${r} ${r} 0 0 1 ${(ox + r * Math.cos(e)).toFixed(3)} ${(oy + r * Math.sin(e)).toFixed(3)}`}
            fill="none" stroke={color} strokeWidth="14" strokeLinecap="round" />
        )
      }
    }

    let capDot = null
    if (pomActive) {
      const ang = (-90 + 360 * pomProgress) * (Math.PI / 180)
      capDot = (
        <circle cx={60 + 40 * Math.cos(ang)} cy={60 + 40 * Math.sin(ang)} r="3.8"
          fill="rgba(255,255,255,0.95)"
          style={{ filter: `drop-shadow(0 0 5px ${pomAccent})` }} />
      )
    }

    return (
      <svg width="150" height="150" viewBox="0 0 120 120" aria-hidden="true">
        <circle cx="60" cy="60" r="40" fill="none" stroke="currentColor"
          className="text-stone-200 dark:text-[var(--dark-elevated)]" strokeWidth="14" />
        {segs}
        {capDot}
      </svg>
    )
  }

  const pomPhaseLabel: Record<PomPhase, string> = {
    work: 'Focus',
    shortBreak: 'Short Break',
    longBreak: 'Long Break',
  }

  // Shared inputs props
  const inputsProps: InputsPanelProps = {
    projects, tags, projectId, selectedTagId, description, link,
    onProjectChange: setProjectId,
    onTagChange: setSelectedTagId,
    onDescriptionChange: setDescription,
    onLinkChange: setLink,
  }

  // ── Daily goal calculation (real-time including active timer) ──
  let activeDurationMs = 0
  if (mode === 'stopwatch' && swStatus !== 'idle') {
    activeDurationMs = swCurrentElapsed
  } else if (mode === 'pomodoro' && pomActive && pomPhase === 'work' && pomPhaseStart) {
    activeDurationMs = Date.now() - pomPhaseStart
  }
  const totalTodayMs = todayTotalMs + activeDurationMs
  const goalPct = dailyTargetHours > 0
    ? Math.min(100, (totalTodayMs / (dailyTargetHours * 3600000)) * 100)
    : 0

  const todayHoursLabel = (() => {
    const totalMin = Math.round(totalTodayMs / 60000)
    const h = Math.floor(totalMin / 60)
    const m = totalMin % 60
    if (h === 0) return `${m}m`
    if (m === 0) return `${h}h`
    return `${h}h ${m}m`
  })()

  return (
    <>
    {discardAlert && (
      <Alert className="mb-4 border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950">
        <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
        <AlertTitle>Entry discarded</AlertTitle>
        <AlertDescription>{discardAlert}</AlertDescription>
      </Alert>
    )}
    <div className="rounded-xl border border-stone-200 dark:border-[var(--dark-border)] bg-white dark:bg-[var(--dark-card)] overflow-hidden mb-5">
      {/* Mode tabs */}
      <div className="flex border-b border-stone-100 dark:border-[var(--dark-border)]">
        {[
          { id: 'stopwatch' as Mode, label: 'Stopwatch' },
          { id: 'manual' as Mode, label: 'Manual' },
          { id: 'pomodoro' as Mode, label: 'Pomodoro' },
        ].map(({ id, label }) => (
          <button
            key={id}
            onClick={() => !isActive && setMode(id)}
            disabled={isActive && id !== mode}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-all border-b-2 ${
              mode === id
                ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-900/10'
                : 'border-transparent text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-300'
            } ${isActive && id !== mode ? 'opacity-40 cursor-not-allowed' : ''}`}
          >
            {id === 'stopwatch' && <Timer className="w-3.5 h-3.5" />}
            {id === 'manual' && <Pencil className="w-3.5 h-3.5" />}
            {id === 'pomodoro' && (
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="14" r="8" /><path d="M12 6V2" /><path d="M8 2h8" />
              </svg>
            )}
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex flex-col xl:flex-row">
        {/* Timer area – 75% */}
        <div className="flex-[3] p-4 min-w-0">

        {/* ═══ STOPWATCH ═══ */}
        {mode === 'stopwatch' && (
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Left: rolling timer + controls */}
            <div className="flex-1 flex flex-col items-center gap-3">
              <div className="py-3">
                <RollingTimerDisplay elapsed={swCurrentElapsed} />
              </div>

              {swStatus === 'running' && (
                <div className="flex items-center justify-center gap-1.5">
                  <span className="inline-flex items-center gap-1.5 bg-rose-50 dark:bg-rose-900/10 rounded-lg px-2 py-0.5">
                    <span className="w-1.5 h-1.5 bg-rose-500 dark:bg-rose-400 rounded-full animate-pulse" />
                    <span className="text-[11px] font-medium text-rose-500 dark:text-rose-400">Recording...</span>
                  </span>
                </div>
              )}
              {swStatus === 'paused' && (
                <div>
                  <span className="text-[11px] font-medium text-amber-500 dark:text-amber-400">Paused</span>
                </div>
              )}

              <div className="flex gap-2 w-full">
                {swStatus === 'idle' ? (
                  <Button className="flex-1 gap-1.5 bg-indigo-500 hover:bg-indigo-600 text-white h-10 rounded-xl shadow-sm shadow-indigo-500/20 text-sm" onClick={swStart} disabled={saving}>
                    <Play className="w-3.5 h-3.5" /> Start
                  </Button>
                ) : (
                  <>
                    {swStatus === 'running' ? (
                      <Button className="flex-1 gap-1.5 bg-amber-500 hover:bg-amber-600 text-white h-10 rounded-xl text-sm" onClick={swPause}>
                        <Pause className="w-3.5 h-3.5" /> Pause
                      </Button>
                    ) : (
                      <Button className="flex-1 gap-1.5 bg-emerald-500 hover:bg-emerald-600 text-white h-10 rounded-xl text-sm" onClick={swResume}>
                        <Play className="w-3.5 h-3.5" /> Resume
                      </Button>
                    )}
                    <Button className="flex-1 gap-1.5 bg-rose-500 hover:bg-rose-600 text-white h-10 rounded-xl text-sm" onClick={swStop} disabled={saving}>
                      <Square className="w-3.5 h-3.5" /> Stop
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* Right: inputs */}
            <div className="flex-1 lg:border-l lg:pl-4 border-stone-100 dark:border-[var(--dark-border)]">
              <InputsPanel {...inputsProps} />
            </div>
          </div>
        )}

        {/* ═══ MANUAL ═══ */}
        {mode === 'manual' && (
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Left: Time card */}
            <div className="flex-1">
              <div className="rounded-xl border border-stone-200 dark:border-[var(--dark-border)] overflow-visible">
                <div className="px-3.5 pt-3 pb-2.5 border-b border-stone-100 dark:border-[var(--dark-border)]">
                  <span className="text-[10px] font-medium text-stone-500 dark:text-stone-400 uppercase tracking-wider block mb-1.5">Time</span>
                  <div className="flex items-center gap-2 mb-2">
                    <input type="date" value={manualDate} onChange={e => setManualDate(e.target.value || todayStr())}
                      className={`flex-1 min-w-0 ${smallInputClass}`} aria-label="Date" />
                    <div className="flex gap-0.5 bg-stone-100 dark:bg-[var(--dark-elevated)] rounded-lg p-0.5 shrink-0">
                      <button type="button" onClick={() => setManualInputType('duration')} className={toggleBtn(manualInputType === 'duration')}>Duration</button>
                      <button type="button" onClick={() => setManualInputType('timeRange')} className={toggleBtn(manualInputType === 'timeRange')}>Range</button>
                    </div>
                  </div>

                  {manualInputType === 'timeRange' ? (
                    <div className="flex gap-2 items-center">
                      <input type="time" value={manualFrom} onChange={e => setManualFrom(e.target.value)}
                        className={`flex-1 ${smallInputClass}`} aria-label="From time" />
                      <svg className="w-3.5 h-3.5 text-stone-300 dark:text-stone-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                      </svg>
                      <input type="time" value={manualTo} onChange={e => setManualTo(e.target.value)}
                        className={`flex-1 ${smallInputClass}`} aria-label="To time" />
                    </div>
                  ) : (
                    <div className="flex items-center justify-around py-1">
                      <div className="flex flex-col items-center gap-1">
                        <div className="flex items-center gap-2.5">
                          <button type="button" onClick={() => setManualHours(h => Math.max(0, h - 1))} className={stepperBtn} aria-label="Decrease hours">-</button>
                          <span className="text-2xl font-semibold w-8 text-center tabular-nums text-stone-900 dark:text-stone-100">{manualHours}</span>
                          <button type="button" onClick={() => setManualHours(h => Math.min(23, h + 1))} className={stepperBtn} aria-label="Increase hours">+</button>
                        </div>
                        <span className="text-[10px] text-stone-400 dark:text-stone-500">hours</span>
                      </div>
                      <span className="text-xl text-stone-200 dark:text-stone-700 mb-3">:</span>
                      <div className="flex flex-col items-center gap-1">
                        <div className="flex items-center gap-2.5">
                          <button type="button" onClick={() => setManualMinutes(m => Math.max(0, m - 5))} className={stepperBtn} aria-label="Decrease minutes">-</button>
                          <span className="text-2xl font-semibold w-8 text-center tabular-nums text-stone-900 dark:text-stone-100">{String(manualMinutes).padStart(2, '0')}</span>
                          <button type="button" onClick={() => setManualMinutes(m => Math.min(55, m + 5))} className={stepperBtn} aria-label="Increase minutes">+</button>
                        </div>
                        <span className="text-[10px] text-stone-400 dark:text-stone-500">min</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between px-3.5 py-2.5 bg-stone-50 dark:bg-[var(--dark)] rounded-b-xl">
                  <span className="text-xs font-medium text-stone-500 dark:text-stone-400">
                    {manualDuration > 0 ? `Total: ${formatDurationShort(manualDuration)}` : 'Total: --'}
                  </span>
                  <Button size="sm" className="h-8 text-xs" onClick={manualSave} disabled={manualDuration === 0 || saving}>
                    {saving ? 'Saving...' : 'Save entry'}
                  </Button>
                </div>
              </div>
            </div>

            {/* Right: inputs */}
            <div className="flex-1 lg:border-l lg:pl-4 border-stone-100 dark:border-[var(--dark-border)]">
              <InputsPanel {...inputsProps} />
            </div>
          </div>
        )}

        {/* ═══ POMODORO ═══ */}
        {mode === 'pomodoro' && (
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Left: ring + controls */}
            <div className="flex-1 flex flex-col items-center gap-3">
              <div className="relative">
                {renderPomRing()}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  {pomActive ? (
                    <>
                      <div className="font-mono font-bold tracking-tight leading-none text-stone-900 dark:text-stone-100" style={{ fontSize: 26 }}>
                        {formatMmSs(pomTimeRemaining)}
                      </div>
                      <div className="text-[9px] font-semibold uppercase tracking-[0.2em] mt-1.5" style={{ color: pomAccent }}>
                        {pomPhaseLabel[pomPhase]}
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="font-mono font-semibold leading-none text-stone-400 dark:text-stone-500" style={{ fontSize: 22 }}>
                        {`${String(pom.workMinutes).padStart(2, '0')}:00`}
                      </div>
                      <div className="text-[9px] font-medium uppercase tracking-[0.2em] mt-1.5 text-stone-400 dark:text-stone-500">Ready</div>
                    </>
                  )}
                </div>
              </div>

              {/* Session dots */}
              <div className="flex items-center gap-1.5">
                {Array.from({ length: pom.sessionsBeforeLongBreak }).map((_, i) => (
                  <div key={i} className={`w-2 h-2 rounded-full transition-all duration-300 ${
                    i < pomSessions ? 'bg-emerald-500 dark:bg-emerald-400' : 'bg-stone-200 dark:bg-stone-700'
                  }`} />
                ))}
                {pomActive && pomTotalWork > 0 && (
                  <span className="text-[10px] text-stone-400 dark:text-stone-500 ml-1">{formatDurationShort(pomTotalWork)} focused</span>
                )}
              </div>

              {/* Controls */}
              <div className="flex gap-2 w-full">
                {!pomActive ? (
                  <Button className="flex-1 gap-1.5 bg-purple-500 hover:bg-purple-600 text-white h-10 rounded-xl shadow-sm shadow-purple-500/20 text-sm" onClick={pomStart} disabled={saving}>
                    <Play className="w-3.5 h-3.5" /> Start Focus
                  </Button>
                ) : pomPhase === 'work' ? (
                  <>
                    <Button className="flex-1 gap-1.5 bg-emerald-500 hover:bg-emerald-600 text-white h-10 rounded-xl text-sm" onClick={() => advancePomPhase()}>
                      <SkipForward className="w-3.5 h-3.5" /> Break
                    </Button>
                    <Button className="flex-1 gap-1.5 bg-rose-500 hover:bg-rose-600 text-white h-10 rounded-xl text-sm" onClick={pomStop} disabled={saving}>
                      <Square className="w-3.5 h-3.5" /> Stop
                    </Button>
                  </>
                ) : (
                  <>
                    <Button className="flex-1 gap-1.5 bg-indigo-500 hover:bg-indigo-600 text-white h-10 rounded-xl text-sm" onClick={() => advancePomPhase()}>
                      <Play className="w-3.5 h-3.5" /> Focus
                    </Button>
                    <Button className="flex-1 gap-1.5 bg-rose-500 hover:bg-rose-600 text-white h-10 rounded-xl text-sm" onClick={pomStop} disabled={saving}>
                      <Square className="w-3.5 h-3.5" /> Stop
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* Right: inputs */}
            <div className="flex-1 lg:border-l lg:pl-4 border-stone-100 dark:border-[var(--dark-border)]">
              <InputsPanel {...inputsProps} />
            </div>
          </div>
        )}
        </div>

        {/* Daily Goal gauge – 25% */}
        <div className="flex-1 border-t xl:border-t-0 xl:border-l border-stone-100 dark:border-[var(--dark-border)] p-4 flex items-center justify-center">
          <DailyGoalGauge percentage={goalPct} todayHours={todayHoursLabel} targetHours={dailyTargetHours} />
        </div>
      </div>
    </div>
    </>
  )
}
