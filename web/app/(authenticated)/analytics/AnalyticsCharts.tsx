'use client'

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface AnalyticsChartsProps {
  weeklyData: { week: string; hours: number }[]
  dailyData: { date: string; hours: number }[]
  projectStats: { name: string; color: string; hours: number; entries: number }[]
  typeData: { name: string; hours: number; count: number; fill: string }[]
  dayOfWeekData: { name: string; hours: number }[]
  peakHoursData: { hour: string; count: number }[]
}

const tooltipStyle = {
  borderRadius: '12px',
  border: '1px solid #e7e5e4',
  fontSize: '13px',
  backgroundColor: '#fff',
}

export default function AnalyticsCharts({
  weeklyData,
  dailyData,
  projectStats,
  typeData,
  dayOfWeekData,
  peakHoursData,
}: AnalyticsChartsProps) {
  return (
    <>
      {/* Daily Trend (30 days) */}
      <Card>
        <CardHeader>
          <CardTitle>Daily Activity (Last 30 Days)</CardTitle>
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
            <div className="text-sm text-stone-400 text-center py-12">No data in the last 30 days</div>
          )}
        </CardContent>
      </Card>

      {/* Weekly Trend */}
      <Card>
        <CardHeader>
          <CardTitle>Weekly Hours (Last 12 Weeks)</CardTitle>
        </CardHeader>
        <CardContent>
          {weeklyData.length > 0 ? (
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
            <div className="text-sm text-stone-400 text-center py-12">No data yet</div>
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
            {projectStats.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={projectStats.slice(0, 8)}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    dataKey="hours"
                    nameKey="name"
                    label={({ name, hours }: any) => `${name}: ${hours}h`}
                    labelLine={false}
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
            ) : (
              <div className="text-sm text-stone-400 text-center py-12">No project data yet</div>
            )}
          </CardContent>
        </Card>

        {/* Entry Type Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Time by Entry Type</CardTitle>
          </CardHeader>
          <CardContent>
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
              <div className="text-sm text-stone-400 text-center py-12">No timing data available</div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  )
}
