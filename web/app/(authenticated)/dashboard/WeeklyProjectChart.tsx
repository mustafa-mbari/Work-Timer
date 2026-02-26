'use client'

import { useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { BarChart3 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { TimeEntry } from '@/lib/repositories/timeEntries'
import type { ProjectFull } from '@/lib/repositories/projects'

interface Props {
  entries: TimeEntry[]
  projects: ProjectFull[]
  weekStartDay: 0 | 1        // 0 = Sunday, 1 = Monday
  workingDays: number         // bitmask: bit 0 = Sun, bit 1 = Mon, ...
}

const FALLBACK_COLOR = '#a8a29e'     // stone-400 for "No project"
const NO_PROJECT_KEY = '__none__'
const BAR_H          = 156           // px, fixed height of the bar area

function getWeekStart(weekStartDay: 0 | 1): Date {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const dayOfWeek = today.getDay()
  const diff = (dayOfWeek - weekStartDay + 7) % 7
  today.setDate(today.getDate() - diff)
  return today
}

function getWeekDates(weekStartDay: 0 | 1, workingDays: number): Date[] {
  // workingDays is a count (5, 6, or 7) — days starting from week start.
  // Matches the extension's getWeekDays() in src/utils/date.ts.
  const start = getWeekStart(weekStartDay)
  const count = Math.max(1, Math.min(7, workingDays))
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    return d
  })
}

function toDateKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export default function WeeklyProjectChart({ entries, projects, weekStartDay, workingDays }: Props) {
  const t = useTranslations('dashboard.overview.weeklyChart')
  const [hoveredDay, setHoveredDay] = useState<string | null>(null)

  const todayKey = useMemo(() => toDateKey(new Date()), [])

  const projectMap = useMemo(() => {
    const m = new Map<string, { name: string; color: string }>()
    for (const p of projects) m.set(p.id, { name: p.name, color: p.color })
    return m
  }, [projects])

  const weekDates = useMemo(() => getWeekDates(weekStartDay, workingDays), [weekStartDay, workingDays])

  const { chartData, usedProjects } = useMemo(() => {
    const dateKeys = new Set(weekDates.map(toDateKey))
    const usedSet  = new Map<string, { name: string; color: string }>()
    const byDate   = new Map<string, Record<string, number>>()
    for (const d of weekDates) byDate.set(toDateKey(d), {})

    function addMs(dateKey: string, projectKey: string, info: { name: string; color: string }, ms: number) {
      const row = byDate.get(dateKey)
      if (!row || ms <= 0) return
      row[projectKey] = (row[projectKey] ?? 0) + ms / 3600000
      if (!usedSet.has(projectKey)) usedSet.set(projectKey, info)
    }

    for (const entry of entries) {
      if (entry.duration <= 0) continue
      let key: string
      let info: { name: string; color: string }
      if (entry.project_id && projectMap.has(entry.project_id)) {
        const p = projectMap.get(entry.project_id)!
        key = p.name; info = p
      } else {
        key  = t('noProject')
        info = { name: key, color: FALLBACK_COLOR }
      }

      let cursor = entry.start_time
      const end  = entry.end_time > entry.start_time ? entry.end_time : entry.start_time + entry.duration
      while (cursor < end) {
        const cursorDate  = new Date(cursor)
        const dayKey      = toDateKey(cursorDate)
        const nextMidnight = new Date(cursorDate.getFullYear(), cursorDate.getMonth(), cursorDate.getDate() + 1).getTime()
        const sliceMs     = Math.min(end, nextMidnight) - cursor
        if (dateKeys.has(dayKey)) addMs(dayKey, key, info, sliceMs)
        cursor = Math.min(end, nextMidnight)
      }
    }

    const data = weekDates.map(d => {
      const dateKey = toDateKey(d)
      return {
        date:     dateKey,
        label:    d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' }),
        dayShort: d.toLocaleDateString(undefined, { weekday: 'short' }),
        ...byDate.get(dateKey),
      }
    })

    return {
      chartData: data,
      usedProjects: Array.from(usedSet.entries()).map(([name, info]) => ({ name, color: info.color })),
    }
  }, [entries, weekDates, projectMap, t])

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
    <div className="rounded-2xl bg-white dark:bg-[var(--dark-card)] border border-stone-100 dark:border-[var(--dark-border)] shadow-sm">

      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-5 pb-2">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center">
            <BarChart3 className="h-4 w-4 text-indigo-500" />
          </div>
          <div>
            <p className="text-sm font-semibold text-stone-800 dark:text-stone-100">{t('title')}</p>
            {hasData && (
              <p className="text-xs text-stone-400 dark:text-stone-500">
                {totalHours.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}h {t('total')}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Legend */}
      {hasData && usedProjects.length > 0 && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-5 pb-3">
          {usedProjects.map(p => (
            <div key={p.name} className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: p.color }} />
              <span className="text-xs text-stone-500 dark:text-stone-400">{p.name}</span>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!hasData ? (
        <div className="h-48 flex flex-col items-center justify-center gap-2 pb-5">
          <BarChart3 className="h-8 w-8 text-stone-300 dark:text-stone-600" />
          <p className="text-sm text-stone-400 dark:text-stone-500 text-center max-w-xs">{t('empty')}</p>
        </div>
      ) : (
        <div className="px-4 pb-5">
          <div className="flex items-end gap-2">
            {chartData.map(day => {
              const row      = day as Record<string, unknown>
              const dayTotal = usedProjects.reduce((s, p) => s + ((row[p.name] as number) ?? 0), 0)
              const barPx    = dayTotal > 0 ? Math.max((dayTotal / maxDayHours) * BAR_H, 4) : 0
              const isToday  = day.date === todayKey
              const segments = usedProjects
                .map(p => ({ ...p, hours: (row[p.name] as number) ?? 0 }))
                .filter(p => p.hours > 0)

              return (
                <div
                  key={day.date}
                  className="flex-1 flex flex-col items-center gap-1 relative"
                  onMouseEnter={() => setHoveredDay(day.date)}
                  onMouseLeave={() => setHoveredDay(null)}
                >
                  {/* Hours label above bar — always reserves space */}
                  <span className={cn(
                    'text-[10px] font-semibold tabular-nums leading-none h-3.5 flex items-center',
                    isToday ? 'text-indigo-500 dark:text-indigo-400' : 'text-stone-500 dark:text-stone-400',
                  )}>
                    {dayTotal > 0
                      ? dayTotal >= 1
                        ? `${dayTotal.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}h`
                        : `${Math.round(dayTotal * 60)}m`
                      : ''}
                  </span>

                  {/* Bar track */}
                  <div
                    className="w-full bg-stone-100 dark:bg-stone-800 rounded-xl overflow-hidden flex flex-col-reverse cursor-default"
                    style={{ height: BAR_H }}
                  >
                    {segments.map((p, si) => (
                      <div
                        key={p.name}
                        style={{
                          height:          (p.hours / maxDayHours) * BAR_H,
                          backgroundColor: p.color,
                          // Round top corners only on the topmost segment
                          borderRadius:    si === segments.length - 1 ? '8px 8px 0 0' : '0',
                        }}
                      />
                    ))}
                  </div>

                  {/* Day label */}
                  <span className={cn(
                    'text-[10px] font-medium mt-0.5',
                    isToday ? 'text-indigo-500 dark:text-indigo-400' : 'text-stone-400 dark:text-stone-500',
                  )}>
                    {day.dayShort}
                  </span>

                  {/* Hover tooltip */}
                  {hoveredDay === day.date && dayTotal > 0 && (
                    <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 z-20 bg-white dark:bg-[var(--dark-card)] border border-stone-200 dark:border-[var(--dark-border)] rounded-xl shadow-xl px-3 py-2.5 text-xs min-w-[130px] pointer-events-none">
                      <p className="text-[10px] text-stone-400 dark:text-stone-500 mb-1.5">{day.label}</p>
                      <div className="space-y-1">
                        {segments.map(p => (
                          <div key={p.name} className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
                              <span className="text-stone-600 dark:text-stone-300 truncate max-w-[80px]">{p.name}</span>
                            </div>
                            <span className="font-semibold text-stone-800 dark:text-stone-100 tabular-nums">
                              {p.hours.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}h
                            </span>
                          </div>
                        ))}
                      </div>
                      {segments.length > 1 && (
                        <div className="mt-1.5 pt-1.5 border-t border-stone-100 dark:border-[var(--dark-border)] flex items-center justify-between">
                          <span className="text-stone-500 dark:text-stone-400">{t('totalLabel')}</span>
                          <span className="font-bold text-stone-900 dark:text-stone-100 tabular-nums">
                            {dayTotal.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}h
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
