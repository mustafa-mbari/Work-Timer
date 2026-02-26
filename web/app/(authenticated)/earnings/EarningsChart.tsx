'use client'

import { useMemo, useState, useCallback } from 'react'
import { TrendingUp } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'

interface DailyEarningRaw {
  date: string
  total: number
  item_id?: string
  item_name?: string
  item_color?: string
}

interface Props {
  data: DailyEarningRaw[]
  currencySymbol: string
}

const FALLBACK_COLOR = '#6366f1'
const TOTAL_KEY = '__total__'

const RANGES = [
  { label: '1W', days: 7 },
  { label: '1M', days: 30 },
  { label: '3M', days: 90 },
  { label: '1Y', days: 365 },
  { label: 'All', days: 0 },
] as const

export default function EarningsChart({ data, currencySymbol }: Props) {
  const [range, setRange] = useState<number>(0)
  // Selected project IDs (or TOTAL_KEY). null = all projects selected initially.
  const [selected, setSelected] = useState<Set<string> | null>(null)

  const hasProjectData = data.length > 0 && !!data[0].item_id

  // Extract unique projects
  const projects = useMemo(() => {
    if (!hasProjectData) {
      return [{ id: '_total', name: 'Total', color: FALLBACK_COLOR }]
    }
    const seen = new Map<string, { name: string; color: string }>()
    for (const d of data) {
      const pid = d.item_id!
      if (!seen.has(pid)) {
        seen.set(pid, { name: d.item_name!, color: d.item_color || FALLBACK_COLOR })
      }
    }
    return Array.from(seen.entries()).map(([id, info]) => ({
      id,
      name: info.name,
      color: info.color,
    }))
  }, [data, hasProjectData])

  // Effective selection: if null, all projects are selected
  const activeIds = useMemo(() => {
    if (selected === null) return new Set(projects.map(p => p.id))
    return selected
  }, [selected, projects])

  const showTotal = activeIds.has(TOTAL_KEY)

  const toggle = useCallback((id: string) => {
    setSelected(prev => {
      const current = prev ?? new Set(projects.map(p => p.id))
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [projects])

  const selectAll = useCallback(() => {
    setSelected(null)
  }, [])

  // Pivot data
  const chartData = useMemo(() => {
    if (!data.length) return []

    let filtered = data
    if (range > 0) {
      const cutoff = new Date()
      cutoff.setDate(cutoff.getDate() - range)
      const cutoffStr = cutoff.toISOString().split('T')[0]
      filtered = data.filter(d => d.date >= cutoffStr)
    }

    const allNames = hasProjectData
      ? [...new Set(filtered.map(d => d.item_name!))]
      : ['Total']

    const byDate = new Map<string, Record<string, number>>()
    for (const d of filtered) {
      if (!byDate.has(d.date)) {
        const row: Record<string, number> = {}
        for (const name of allNames) row[name] = 0
        if (showTotal) row['Total'] = 0
        byDate.set(d.date, row)
      }
      const row = byDate.get(d.date)!
      const key = hasProjectData ? d.item_name! : 'Total'
      row[key] = (row[key] ?? 0) + d.total
      // Accumulate total line
      if (showTotal && hasProjectData) {
        row['Total'] = (row['Total'] ?? 0) + d.total
      }
    }

    return Array.from(byDate.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, values]) => ({
        date,
        label: formatDateLabel(date),
        ...values,
      }))
  }, [data, range, hasProjectData, showTotal])

  // Visible series: filtered projects + optional total
  const visibleSeries = useMemo(() => {
    const series: Array<{ id: string; name: string; color: string }> = []
    if (hasProjectData) {
      for (const p of projects) {
        if (activeIds.has(p.id)) series.push(p)
      }
      if (showTotal) {
        series.push({ id: TOTAL_KEY, name: 'Total', color: FALLBACK_COLOR })
      }
    } else {
      series.push({ id: '_total', name: 'Total', color: FALLBACK_COLOR })
    }
    return series
  }, [projects, activeIds, showTotal, hasProjectData])

  const periodTotal = useMemo(() => {
    let sum = 0
    for (const row of chartData) {
      for (const p of projects) {
        sum += ((row as unknown as Record<string, number>)[p.name] ?? 0)
      }
    }
    return sum
  }, [chartData, projects])

  const noneSelected = hasProjectData && activeIds.size === 0
  const allSelected = selected === null

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-2">
          <div>
            <p className="text-xs font-medium text-stone-500 dark:text-stone-400 uppercase tracking-wider">
              Earnings Over Time
            </p>
            {chartData.length > 0 && (
              <p className="text-2xl font-bold text-stone-900 dark:text-stone-100 mt-0.5">
                {currencySymbol}{periodTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            )}
          </div>
          <div className="flex items-center bg-stone-100 dark:bg-[var(--dark-elevated)] rounded-lg p-0.5">
            {RANGES.map(r => (
              <button
                key={r.label}
                onClick={() => setRange(r.days)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
                  range === r.days
                    ? 'bg-white dark:bg-[var(--dark-card)] text-stone-900 dark:text-stone-100 shadow-sm'
                    : 'text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-300'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {/* Project filter chips */}
        {hasProjectData && projects.length > 1 && (
          <div className="flex flex-wrap items-center gap-1.5 px-5 pb-3">
            <button
              onClick={selectAll}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-all border ${
                allSelected
                  ? 'bg-stone-800 dark:bg-stone-200 text-white dark:text-stone-900 border-transparent'
                  : 'bg-white dark:bg-[var(--dark-card)] text-stone-500 dark:text-stone-400 border-stone-200 dark:border-[var(--dark-border)] hover:border-stone-300'
              }`}
            >
              All
            </button>
            {projects.map(p => {
              const active = activeIds.has(p.id)
              return (
                <button
                  key={p.id}
                  onClick={() => toggle(p.id)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all border ${
                    active
                      ? 'border-transparent text-white'
                      : 'bg-white dark:bg-[var(--dark-card)] text-stone-400 dark:text-stone-500 border-stone-200 dark:border-[var(--dark-border)] hover:border-stone-300'
                  }`}
                  style={active ? { backgroundColor: p.color } : undefined}
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ backgroundColor: active ? '#fff' : p.color }}
                  />
                  {p.name}
                </button>
              )
            })}
            <button
              onClick={() => toggle(TOTAL_KEY)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all border ${
                showTotal
                  ? 'bg-indigo-500 text-white border-transparent'
                  : 'bg-white dark:bg-[var(--dark-card)] text-stone-400 dark:text-stone-500 border-stone-200 dark:border-[var(--dark-border)] hover:border-stone-300'
              }`}
            >
              <span
                className="w-1.5 h-1.5 rounded-full shrink-0"
                style={{ backgroundColor: showTotal ? '#fff' : FALLBACK_COLOR }}
              />
              Total
            </button>
          </div>
        )}

        {chartData.length === 0 || noneSelected ? (
          <div className="h-52 flex flex-col items-center justify-center gap-2 pb-5">
            <TrendingUp className="h-8 w-8 text-stone-300 dark:text-stone-600" />
            <p className="text-sm text-stone-400 dark:text-stone-500 text-center max-w-xs">
              {noneSelected
                ? 'Select at least one project to display the chart.'
                : 'No earnings data for this period. Select a date range using the filters above.'}
            </p>
          </div>
        ) : (
          <div className="h-72 px-2 pb-3">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <defs>
                  {visibleSeries.map(p => (
                    <linearGradient key={p.id} id={`grad-${p.id}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={p.color} stopOpacity={0.25} />
                      <stop offset="100%" stopColor={p.color} stopOpacity={0.02} />
                    </linearGradient>
                  ))}
                </defs>
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
                  interval="preserveStartEnd"
                  dy={4}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: 'var(--color-stone-400, #a8a29e)' }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={v => `${currencySymbol}${v}`}
                  width={60}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null
                    const dateStr = payload[0]?.payload?.date as string | undefined
                    const items = payload
                      .filter(p => typeof p.value === 'number' && p.value > 0)
                      .sort((a, b) => (b.value as number) - (a.value as number))
                    if (!items.length) return null
                    const dayTotal = items
                      .filter(i => i.dataKey !== 'Total')
                      .reduce((s, p) => s + (p.value as number), 0)
                    return (
                      <div className="rounded-xl bg-white dark:bg-[var(--dark-card)] border border-stone-200 dark:border-[var(--dark-border)] shadow-xl px-4 py-3 text-sm min-w-[160px]">
                        <p className="text-stone-400 dark:text-stone-500 text-xs mb-2">
                          {dateStr ?? label}
                        </p>
                        <div className="space-y-1.5">
                          {items.map(item => (
                            <div key={item.dataKey as string} className="flex items-center justify-between gap-4">
                              <div className="flex items-center gap-1.5">
                                <span
                                  className="w-2 h-2 rounded-full shrink-0"
                                  style={{ backgroundColor: item.color }}
                                />
                                <span className={`text-xs truncate max-w-[100px] ${
                                  item.dataKey === 'Total'
                                    ? 'font-semibold text-stone-800 dark:text-stone-100'
                                    : 'text-stone-600 dark:text-stone-300'
                                }`}>
                                  {item.dataKey as string}
                                </span>
                              </div>
                              <span className="text-xs font-semibold text-stone-800 dark:text-stone-100 tabular-nums">
                                {currencySymbol}{(item.value as number).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                            </div>
                          ))}
                        </div>
                        {items.length > 1 && !showTotal && (
                          <div className="mt-2 pt-2 border-t border-stone-100 dark:border-[var(--dark-border)] flex items-center justify-between">
                            <span className="text-xs font-medium text-stone-500 dark:text-stone-400">Total</span>
                            <span className="text-sm font-bold text-stone-900 dark:text-stone-100 tabular-nums">
                              {currencySymbol}{dayTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          </div>
                        )}
                      </div>
                    )
                  }}
                  cursor={{
                    stroke: 'var(--color-stone-300, #d6d3d1)',
                    strokeWidth: 1,
                    strokeDasharray: '4 4',
                  }}
                />
                {visibleSeries.map(p => (
                  <Area
                    key={p.id}
                    type="monotone"
                    dataKey={p.name}
                    stroke={p.color}
                    strokeWidth={p.id === TOTAL_KEY ? 2.5 : 2}
                    fill={`url(#grad-${p.id})`}
                    dot={false}
                    activeDot={{
                      r: 4,
                      fill: p.color,
                      stroke: '#fff',
                      strokeWidth: 2,
                    }}
                    strokeDasharray={p.id === TOTAL_KEY ? '6 3' : undefined}
                    connectNulls
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}
