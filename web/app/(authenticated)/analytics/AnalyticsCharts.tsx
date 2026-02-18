'use client'

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area,
} from 'recharts'
import { BarChart2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card'

interface AnalyticsChartsProps {
  weeklyData: { week: string; hours: number }[]
  dailyData: { date: string; hours: number }[]
  projectStats: { name: string; color: string; hours: number; entries: number }[]
  typeData: { name: string; hours: number; count: number; fill: string }[]
  dayOfWeekData: { name: string; hours: number }[]
  peakHoursData: { hour: string; count: number }[]
  isFiltered?: boolean
}

const tooltipStyle = {
  borderRadius: '12px',
  border: '1px solid #e7e5e4',
  fontSize: '13px',
  backgroundColor: '#fff',
}

function ChartEmpty({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center gap-2 py-12 text-center">
      <BarChart2 className="h-8 w-8 text-stone-300 dark:text-stone-600" />
      <p className="text-sm text-stone-400 dark:text-stone-500">{message}</p>
    </div>
  )
}

export default function AnalyticsCharts({
  weeklyData,
  dailyData,
  projectStats,
  typeData,
  dayOfWeekData,
  peakHoursData,
  isFiltered,
}: AnalyticsChartsProps) {
  const dailyTitle  = isFiltered ? 'Daily Activity' : 'Daily Activity (Last 30 Days)'
  const weeklyTitle = isFiltered ? 'Weekly Hours' : 'Weekly Hours (Last 12 Weeks)'

  return (
    <>
      {/* Daily Trend */}
      <Card>
        <CardHeader>
          <CardTitle>{dailyTitle}</CardTitle>
        </CardHeader>
        <CardContent>
          {dailyData.some(d => d.hours > 0) ? (
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={dailyData}>
                <defs>
                  <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-stone-200 dark:stroke-stone-700" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11 }}
                  className="fill-stone-500"
                  interval={4}
                />
                <YAxis
                  tick={{ fontSize: 12 }}
                  className="fill-stone-500"
                  tickFormatter={(v) => `${v}h`}
                />
                <Tooltip
                  formatter={(value) => [`${value}h`, 'Hours']}
                  contentStyle={tooltipStyle}
                />
                <Area
                  type="monotone"
                  dataKey="hours"
                  stroke="#6366f1"
                  strokeWidth={2}
                  fill="url(#areaGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <ChartEmpty message="No activity in the selected period" />
          )}
        </CardContent>
      </Card>

      {/* Weekly Trend */}
      <Card>
        <CardHeader>
          <CardTitle>{weeklyTitle}</CardTitle>
        </CardHeader>
        <CardContent>
          {weeklyData.some(d => d.hours > 0) ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-stone-200 dark:stroke-stone-700" />
                <XAxis
                  dataKey="week"
                  tick={{ fontSize: 12 }}
                  className="fill-stone-500"
                />
                <YAxis
                  tick={{ fontSize: 12 }}
                  className="fill-stone-500"
                  tickFormatter={(v) => `${v}h`}
                />
                <Tooltip
                  formatter={(value) => [`${value}h`, 'Hours']}
                  contentStyle={tooltipStyle}
                />
                <Bar dataKey="hours" fill="#6366f1" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <ChartEmpty message="No weekly data in the selected period" />
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Project Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Time by Project</CardTitle>
          </CardHeader>
          <CardContent>
            {projectStats.some(p => p.hours > 0) ? (
              <div>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={projectStats.slice(0, 8)}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      innerRadius={40}
                      dataKey="hours"
                      nameKey="name"
                    >
                      {projectStats.slice(0, 8).map((p, i) => (
                        <Cell key={i} fill={p.color || '#6366f1'} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value) => [`${value}h`, 'Hours']}
                      contentStyle={tooltipStyle}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-3 space-y-1.5">
                  {projectStats.slice(0, 8).map((p, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: p.color || '#6366f1' }} />
                        <span className="text-stone-700 dark:text-stone-300 truncate">{p.name}</span>
                      </div>
                      <span className="text-stone-500 dark:text-stone-400 shrink-0 ml-2">{p.hours}h</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <ChartEmpty message="No project data for the selected period" />
            )}
          </CardContent>
        </Card>

        {/* Entry Type Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Time by Entry Type</CardTitle>
          </CardHeader>
          <CardContent>
            {typeData.some(t => t.hours > 0) ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={typeData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-stone-200 dark:stroke-stone-700" />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 12 }}
                    className="fill-stone-500"
                    tickFormatter={(v) => `${v}h`}
                  />
                  <YAxis
                    dataKey="name"
                    type="category"
                    tick={{ fontSize: 12 }}
                    className="fill-stone-500"
                    width={80}
                  />
                  <Tooltip
                    formatter={(value, name, props) => [`${value}h (${props.payload.count} entries)`, 'Hours']}
                    contentStyle={tooltipStyle}
                  />
                  <Bar dataKey="hours" radius={[0, 6, 6, 0]}>
                    {typeData.map((d, i) => (
                      <Cell key={i} fill={d.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <ChartEmpty message="No entry type data for the selected period" />
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Day of Week */}
        <Card>
          <CardHeader>
            <CardTitle>Hours by Day of Week</CardTitle>
          </CardHeader>
          <CardContent>
            {dayOfWeekData.some(d => d.hours > 0) ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={dayOfWeekData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-stone-200 dark:stroke-stone-700" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 12 }}
                    className="fill-stone-500"
                  />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    className="fill-stone-500"
                    tickFormatter={(v) => `${v}h`}
                  />
                  <Tooltip
                    formatter={(value) => [`${value}h`, 'Hours']}
                    contentStyle={tooltipStyle}
                  />
                  <Bar dataKey="hours" fill="#10b981" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <ChartEmpty message="No day-of-week data for the selected period" />
            )}
          </CardContent>
        </Card>

        {/* Peak Hours */}
        <Card>
          <CardHeader>
            <CardTitle>Peak Working Hours</CardTitle>
          </CardHeader>
          <CardContent>
            {peakHoursData.some(h => h.count > 0) ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={peakHoursData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-stone-200 dark:stroke-stone-700" />
                  <XAxis
                    dataKey="hour"
                    tick={{ fontSize: 10 }}
                    className="fill-stone-500"
                    interval={2}
                  />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    className="fill-stone-500"
                  />
                  <Tooltip
                    formatter={(value) => [`${value} entries`, 'Count']}
                    contentStyle={tooltipStyle}
                  />
                  <Bar dataKey="count" fill="#a855f7" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <ChartEmpty message="No timing data for the selected period" />
            )}
          </CardContent>
        </Card>
      </div>
    </>
  )
}
