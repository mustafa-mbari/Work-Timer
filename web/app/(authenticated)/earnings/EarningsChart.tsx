'use client'

import { useMemo } from 'react'
import { BarChart3 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'

interface DailyEarning {
  date: string
  total: number
}

interface Props {
  data: DailyEarning[]
  currencySymbol: string
}

export default function EarningsChart({ data, currencySymbol }: Props) {
  const chartData = useMemo(() => {
    if (!data.length) return []
    return data.map(d => ({
      date: d.date,
      label: formatDateLabel(d.date),
      total: d.total,
    }))
  }, [data])

  return (
    <Card>
      <CardHeader>
        <CardTitle>Earnings Over Time</CardTitle>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <div className="h-48 flex flex-col items-center justify-center gap-2">
            <BarChart3 className="h-8 w-8 text-stone-300 dark:text-stone-600" />
            <p className="text-sm text-stone-400 dark:text-stone-500 text-center max-w-xs">
              No earnings data for this period. Select a date range using the filters above.
            </p>
          </div>
        ) : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-stone-200, #e7e5e4)" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: 'var(--color-stone-400, #a8a29e)' }}
                  tickLine={false}
                  axisLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fontSize: 11, fill: 'var(--color-stone-400, #a8a29e)' }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={v => `${currencySymbol}${v}`}
                  width={60}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.[0]) return null
                    const item = payload[0].payload as (typeof chartData)[number]
                    return (
                      <div className="rounded-lg bg-white dark:bg-[var(--dark-card)] border border-stone-200 dark:border-[var(--dark-border)] shadow-lg px-3 py-2 text-sm">
                        <p className="text-stone-500 dark:text-stone-400 text-xs">{item.date}</p>
                        <p className="font-semibold text-stone-800 dark:text-stone-100">
                          {currencySymbol}{item.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                      </div>
                    )
                  }}
                />
                <Bar
                  dataKey="total"
                  fill="#6366f1"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={40}
                />
              </BarChart>
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
