'use client'

import { useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { BarChart3 } from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'
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

/**
 * Get the start of the current week based on weekStartDay setting.
 */
function getWeekStart(weekStartDay: 0 | 1): Date {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const dayOfWeek = today.getDay() // 0=Sun
  const diff = (dayOfWeek - weekStartDay + 7) % 7
  today.setDate(today.getDate() - diff)
  return today
}

/**
 * Build an array of dates for the week, respecting workingDays bitmask.
 */
function getWeekDates(weekStartDay: 0 | 1, workingDays: number): Date[] {
  const start = getWeekStart(weekStartDay)
  const dates: Date[] = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    const dayBit = 1 << d.getDay()
    if (workingDays & dayBit) {
      dates.push(d)
    }
  }
  return dates
}

function toDateKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function formatDayLabel(d: Date): string {
  return d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' })
}

export default function WeeklyProjectChart({ entries, projects, weekStartDay, workingDays }: Props) {
  const t = useTranslations('dashboard.overview.weeklyChart')

  // Map project id -> project info
  const projectMap = useMemo(() => {
    const m = new Map<string, { name: string; color: string }>()
    for (const p of projects) {
      m.set(p.id, { name: p.name, color: p.color })
    }
    return m
  }, [projects])

  // Week dates based on settings
  const weekDates = useMemo(() => getWeekDates(weekStartDay, workingDays), [weekStartDay, workingDays])

  // Build chart data: one row per day, split entries that cross midnight
  const { chartData, usedProjects } = useMemo(() => {
    const dateKeys = new Set(weekDates.map(toDateKey))

    // Collect all projects that actually appear in entries
    const usedSet = new Map<string, { name: string; color: string }>()

    // Aggregate hours per date per project
    const byDate = new Map<string, Record<string, number>>()
    for (const d of weekDates) {
      byDate.set(toDateKey(d), {})
    }

    // Helper: add ms to a day bucket
    function addMs(dateKey: string, projectKey: string, info: { name: string; color: string }, ms: number) {
      const row = byDate.get(dateKey)
      if (!row || ms <= 0) return
      row[projectKey] = (row[projectKey] ?? 0) + ms / 3600000
      if (!usedSet.has(projectKey)) usedSet.set(projectKey, info)
    }

    for (const entry of entries) {
      if (entry.duration <= 0) continue

      // Resolve project
      let key: string
      let info: { name: string; color: string }
      if (entry.project_id && projectMap.has(entry.project_id)) {
        const p = projectMap.get(entry.project_id)!
        key = p.name
        info = p
      } else {
        key = t('noProject')
        info = { name: key, color: FALLBACK_COLOR }
      }

      // Split entry across days using start_time / end_time
      let cursor = entry.start_time
      const end = entry.end_time > entry.start_time ? entry.end_time : entry.start_time + entry.duration

      while (cursor < end) {
        const cursorDate = new Date(cursor)
        const dayKey = toDateKey(cursorDate)
        // Next midnight local
        const nextMidnight = new Date(cursorDate.getFullYear(), cursorDate.getMonth(), cursorDate.getDate() + 1).getTime()
        const sliceEnd = Math.min(end, nextMidnight)
        const sliceMs = sliceEnd - cursor

        if (dateKeys.has(dayKey)) {
          addMs(dayKey, key, info, sliceMs)
        }

        cursor = sliceEnd
      }
    }

    const data = weekDates.map(d => ({
      date: toDateKey(d),
      label: formatDayLabel(d),
      ...byDate.get(toDateKey(d)),
    }))

    return {
      chartData: data,
      usedProjects: Array.from(usedSet.entries()).map(([name, info]) => ({
        name,
        color: info.color,
      })),
    }
  }, [entries, weekDates, projectMap, t])

  // Total hours this week
  const totalHours = useMemo(() => {
    let sum = 0
    for (const row of chartData) {
      for (const p of usedProjects) {
        sum += ((row as Record<string, unknown>)[p.name] as number) ?? 0
      }
    }
    return sum
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
            <p className="text-sm font-semibold text-stone-800 dark:text-stone-100">
              {t('title')}
            </p>
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
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-5 pb-2">
          {usedProjects.map(p => (
            <div key={p.name} className="flex items-center gap-1.5">
              <span
                className="w-2.5 h-2.5 rounded-sm shrink-0"
                style={{ backgroundColor: p.color }}
              />
              <span className="text-xs text-stone-500 dark:text-stone-400">{p.name}</span>
            </div>
          ))}
        </div>
      )}

      {/* Chart or empty state */}
      {!hasData ? (
        <div className="h-48 flex flex-col items-center justify-center gap-2 pb-5">
          <BarChart3 className="h-8 w-8 text-stone-300 dark:text-stone-600" />
          <p className="text-sm text-stone-400 dark:text-stone-500 text-center max-w-xs">
            {t('empty')}
          </p>
        </div>
      ) : (
        <div className="h-64 sm:h-72 px-2 pb-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 8, right: 12, left: 0, bottom: 0 }}
              barCategoryGap="20%"
            >
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="var(--color-stone-200, #e7e5e4)"
                strokeOpacity={0.5}
              />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: 'var(--color-stone-400, #a8a29e)' }}
                tickLine={false}
                axisLine={false}
                dy={4}
              />
              <YAxis
                tick={{ fontSize: 11, fill: 'var(--color-stone-400, #a8a29e)' }}
                tickLine={false}
                axisLine={false}
                tickFormatter={v => `${v}h`}
                width={40}
                allowDecimals={false}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null
                  const items = payload
                    .filter(p => typeof p.value === 'number' && p.value > 0)
                    .sort((a, b) => (b.value as number) - (a.value as number))
                  if (!items.length) return null
                  const dayTotal = items.reduce((s, p) => s + (p.value as number), 0)
                  return (
                    <div className="rounded-xl bg-white dark:bg-[var(--dark-card)] border border-stone-200 dark:border-[var(--dark-border)] shadow-xl px-4 py-3 text-sm min-w-[140px]">
                      <p className="text-stone-400 dark:text-stone-500 text-xs mb-2">{label}</p>
                      <div className="space-y-1.5">
                        {items.map(item => (
                          <div key={item.dataKey as string} className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-1.5">
                              <span
                                className="w-2 h-2 rounded-full shrink-0"
                                style={{ backgroundColor: item.color as string }}
                              />
                              <span className="text-xs text-stone-600 dark:text-stone-300 truncate max-w-[100px]">
                                {item.dataKey as string}
                              </span>
                            </div>
                            <span className="text-xs font-semibold text-stone-800 dark:text-stone-100 tabular-nums">
                              {(item.value as number).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}h
                            </span>
                          </div>
                        ))}
                      </div>
                      {items.length > 1 && (
                        <div className="mt-2 pt-2 border-t border-stone-100 dark:border-[var(--dark-border)] flex items-center justify-between">
                          <span className="text-xs font-medium text-stone-500 dark:text-stone-400">{t('totalLabel')}</span>
                          <span className="text-sm font-bold text-stone-900 dark:text-stone-100 tabular-nums">
                            {dayTotal.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}h
                          </span>
                        </div>
                      )}
                    </div>
                  )
                }}
                cursor={{ fill: 'var(--color-stone-100, #f5f5f4)', opacity: 0.5 }}
              />
              {usedProjects.map((p, i) => (
                <Bar
                  key={p.name}
                  dataKey={p.name}
                  stackId="projects"
                  fill={p.color}
                  radius={i === usedProjects.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
