import { useMemo, useState } from 'react'
import type { TimeEntry, Project } from '@/types'
import { getWeekDays } from '@/utils/date'
import { format } from 'date-fns'
import { BarChart3Icon } from './Icons'

interface WeeklyChartProps {
  entries: TimeEntry[]
  projects: Project[]
  weekStartsOn: 0 | 1
  workingDays: number
}

const FALLBACK_COLOR = '#a8a29e'
const NO_PROJECT_KEY = '__none__'
const BAR_H = 120

function toDateKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export default function WeeklyChart({ entries, projects, weekStartsOn, workingDays }: WeeklyChartProps) {
  const [hoveredDay, setHoveredDay] = useState<string | null>(null)

  const todayKey = useMemo(() => toDateKey(new Date()), [])

  const projectMap = useMemo(() => {
    const m = new Map<string, { name: string; color: string }>()
    for (const p of projects) m.set(p.id, { name: p.name, color: p.color })
    return m
  }, [projects])

  const weekDates = useMemo(
    () => getWeekDays(new Date(), weekStartsOn, workingDays),
    [weekStartsOn, workingDays]
  )

  const { chartData, usedProjects } = useMemo(() => {
    const dateKeys = new Set(weekDates.map(toDateKey))
    const usedSet = new Map<string, { name: string; color: string }>()
    const byDate = new Map<string, Record<string, number>>()
    for (const d of weekDates) byDate.set(toDateKey(d), {})

    function addMs(dateKey: string, projectKey: string, info: { name: string; color: string }, ms: number) {
      const row = byDate.get(dateKey)
      if (!row || ms <= 0) return
      row[projectKey] = (row[projectKey] ?? 0) + ms / 3600000
      if (!usedSet.has(projectKey)) usedSet.set(projectKey, info)
    }

    for (const entry of entries) {
      if (entry.duration <= 0) continue
      const pid = entry.projectId ?? NO_PROJECT_KEY
      const project = projectMap.get(pid)
      const name = project?.name ?? 'No Project'
      const color = project?.color ?? FALLBACK_COLOR

      let cursor = entry.startTime
      const end = entry.endTime > entry.startTime
        ? entry.endTime
        : entry.startTime + entry.duration

      while (cursor < end) {
        const cursorDate = new Date(cursor)
        const dayKey = toDateKey(cursorDate)
        const nextMidnight = new Date(
          cursorDate.getFullYear(),
          cursorDate.getMonth(),
          cursorDate.getDate() + 1
        ).getTime()
        const sliceMs = Math.min(end, nextMidnight) - cursor
        if (dateKeys.has(dayKey)) addMs(dayKey, name, { name, color }, sliceMs)
        cursor = Math.min(end, nextMidnight)
      }
    }

    const data = weekDates.map(d => {
      const dateKey = toDateKey(d)
      return {
        date: dateKey,
        label: format(d, 'EEE d'),
        dayShort: format(d, 'EEE'),
        ...byDate.get(dateKey),
      }
    })

    return {
      chartData: data,
      usedProjects: Array.from(usedSet.entries()).map(([name, info]) => ({ name, color: info.color })),
    }
  }, [entries, weekDates, projectMap])

  const totalHours = useMemo(() => {
    let sum = 0
    for (const row of chartData)
      for (const p of usedProjects)
        sum += ((row as Record<string, unknown>)[p.name] as number) ?? 0
    return sum
  }, [chartData, usedProjects])

  const maxDayHours = useMemo(() => {
    return Math.max(
      ...chartData.map(row =>
        usedProjects.reduce((s, p) => s + (((row as Record<string, unknown>)[p.name] as number) ?? 0), 0)
      ),
      0.5,
    )
  }, [chartData, usedProjects])

  const hasData = totalHours > 0

  return (
    <div className="rounded-xl bg-white dark:bg-dark-card border border-stone-100 dark:border-dark-border">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center">
            <BarChart3Icon className="h-3.5 w-3.5 text-indigo-500 dark:text-indigo-400" />
          </div>
          <div>
            <p className="text-xs font-semibold text-stone-800 dark:text-stone-100">This Week</p>
            {hasData && (
              <p className="text-[10px] text-stone-400 dark:text-stone-400">
                {totalHours.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}h total
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Legend */}
      {hasData && usedProjects.length > 0 && (
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 px-4 pb-2">
          {usedProjects.map(p => (
            <div key={p.name} className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-sm shrink-0" style={{ backgroundColor: p.color }} />
              <span className="text-[10px] text-stone-500 dark:text-stone-400">{p.name}</span>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!hasData ? (
        <div className="h-36 flex flex-col items-center justify-center gap-1.5 pb-4">
          <BarChart3Icon className="h-6 w-6 text-stone-300 dark:text-stone-600" />
          <p className="text-xs text-stone-400 dark:text-stone-400">No entries this week</p>
        </div>
      ) : (
        <div className="px-3 pb-4">
          <div className="flex items-end gap-1.5">
            {chartData.map(day => {
              const row = day as Record<string, unknown>
              const dayTotal = usedProjects.reduce((s, p) => s + ((row[p.name] as number) ?? 0), 0)
              const isToday = day.date === todayKey
              const segments = usedProjects
                .map(p => ({ ...p, hours: (row[p.name] as number) ?? 0 }))
                .filter(p => p.hours > 0)

              return (
                <div
                  key={day.date}
                  className="flex-1 flex flex-col items-center gap-0.5 relative"
                  onMouseEnter={() => setHoveredDay(day.date)}
                  onMouseLeave={() => setHoveredDay(null)}
                >
                  {/* Hours label */}
                  <span className={`text-[9px] font-semibold tabular-nums leading-none h-3 flex items-center ${
                    isToday ? 'text-indigo-500 dark:text-indigo-400' : 'text-stone-500 dark:text-stone-400'
                  }`}>
                    {dayTotal > 0
                      ? dayTotal >= 1
                        ? `${dayTotal.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}h`
                        : `${Math.round(dayTotal * 60)}m`
                      : ''}
                  </span>

                  {/* Bar track */}
                  <div
                    className="w-full bg-stone-100 dark:bg-stone-800 rounded-lg overflow-hidden flex flex-col-reverse cursor-default"
                    style={{ height: BAR_H }}
                  >
                    {segments.map((p, si) => (
                      <div
                        key={p.name}
                        style={{
                          height: (p.hours / maxDayHours) * BAR_H,
                          backgroundColor: p.color,
                          borderRadius: si === segments.length - 1 ? '6px 6px 0 0' : '0',
                        }}
                      />
                    ))}
                  </div>

                  {/* Day label */}
                  <span className={`text-[9px] font-medium mt-0.5 ${
                    isToday ? 'text-indigo-500 dark:text-indigo-400' : 'text-stone-400 dark:text-stone-400'
                  }`}>
                    {day.dayShort}
                  </span>

                  {/* Hover tooltip */}
                  {hoveredDay === day.date && dayTotal > 0 && (
                    <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 z-20 bg-white dark:bg-dark-card border border-stone-200 dark:border-dark-border rounded-xl shadow-xl px-2.5 py-2 text-[10px] min-w-[110px] pointer-events-none">
                      <p className="text-[9px] text-stone-400 dark:text-stone-400 mb-1">{day.label}</p>
                      <div className="space-y-0.5">
                        {segments.map(p => (
                          <div key={p.name} className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
                              <span className="text-stone-600 dark:text-stone-300 truncate max-w-[70px]">{p.name}</span>
                            </div>
                            <span className="font-semibold text-stone-800 dark:text-stone-100 tabular-nums">
                              {p.hours.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}h
                            </span>
                          </div>
                        ))}
                      </div>
                      {segments.length > 1 && (
                        <div className="mt-1 pt-1 border-t border-stone-100 dark:border-dark-border flex items-center justify-between">
                          <span className="text-stone-500 dark:text-stone-400">Total</span>
                          <span className="font-bold text-stone-900 dark:text-stone-100 tabular-nums">
                            {dayTotal.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}h
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
