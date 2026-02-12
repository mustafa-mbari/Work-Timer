import { useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { useEntries, useEntriesRange } from '@/hooks/useEntries'
import { useProjects } from '@/hooks/useProjects'
import { getWeekRange, getWeekDays, formatDate, formatDurationShort, msToHours } from '@/utils/date'
import { format } from 'date-fns'
import ExportMenu from './ExportMenu'

export default function StatsView() {
  const { entries: todayEntries, totalDuration: todayTotal } = useEntries()
  const { activeProjects } = useProjects()

  const weekStartsOn = 1 as const
  const { start, end } = getWeekRange(new Date(), weekStartsOn)
  const days = getWeekDays(new Date(), weekStartsOn, 7)
  const { entries: weekEntries } = useEntriesRange(formatDate(start), formatDate(end))

  const weekTotal = weekEntries.reduce((sum, e) => sum + e.duration, 0)
  const daysWithEntries = new Set(weekEntries.map(e => e.date)).size
  const avgDaily = daysWithEntries > 0 ? weekTotal / daysWithEntries : 0

  // Bar chart: daily hours this week
  const barData = useMemo(() => {
    return days.map(day => {
      const key = formatDate(day)
      const total = weekEntries
        .filter(e => e.date === key)
        .reduce((sum, e) => sum + e.duration, 0)
      return {
        day: format(day, 'EEE'),
        hours: msToHours(total),
      }
    })
  }, [days, weekEntries])

  // Pie chart: today by project
  const pieData = useMemo(() => {
    const byProject = new Map<string, number>()
    for (const entry of todayEntries) {
      const pid = entry.projectId ?? '__none__'
      byProject.set(pid, (byProject.get(pid) ?? 0) + entry.duration)
    }

    return Array.from(byProject.entries()).map(([pid, duration]) => {
      const project = activeProjects.find(p => p.id === pid)
      return {
        name: project?.name ?? 'No Project',
        value: msToHours(duration),
        color: project?.color ?? '#9ca3af',
      }
    })
  }, [todayEntries, activeProjects])

  return (
    <div className="flex flex-col p-4 gap-4">
      <div className="flex justify-between items-center">
        <h2 className="text-sm font-semibold text-gray-800">Statistics</h2>
        <ExportMenu
          entries={weekEntries}
          projects={activeProjects}
          filename={`work-timer-week-${formatDate(start)}`}
        />
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-blue-50 rounded-lg p-2.5 text-center">
          <div className="text-lg font-bold text-blue-700">{formatDurationShort(todayTotal)}</div>
          <div className="text-[10px] text-blue-600">Today</div>
        </div>
        <div className="bg-green-50 rounded-lg p-2.5 text-center">
          <div className="text-lg font-bold text-green-700">{formatDurationShort(weekTotal)}</div>
          <div className="text-[10px] text-green-600">This Week</div>
        </div>
        <div className="bg-purple-50 rounded-lg p-2.5 text-center">
          <div className="text-lg font-bold text-purple-700">{formatDurationShort(avgDaily)}</div>
          <div className="text-[10px] text-purple-600">Daily Avg</div>
        </div>
      </div>

      {/* Weekly Bar Chart */}
      <div>
        <h3 className="text-xs font-medium text-gray-500 mb-2">This Week</h3>
        <div className="h-36">
          <ResponsiveContainer width="100%" height="100%" minHeight={144}>
            <BarChart data={barData}>
              <XAxis dataKey="day" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} width={25} />
              <Tooltip
                formatter={(value) => [`${value}h`, 'Hours']}
                contentStyle={{ fontSize: 12 }}
              />
              <Bar dataKey="hours" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Today by Project */}
      {pieData.length > 0 && (
        <div>
          <h3 className="text-xs font-medium text-gray-500 mb-2">Today by Project</h3>
          <div className="flex items-center gap-4">
            <div className="w-24 h-24">
              <ResponsiveContainer width="100%" height="100%" minWidth={96} minHeight={96}>
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    cx="50%"
                    cy="50%"
                    innerRadius={20}
                    outerRadius={40}
                    paddingAngle={2}
                  >
                    {pieData.map((d, i) => (
                      <Cell key={i} fill={d.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-col gap-1">
              {pieData.map((d) => (
                <div key={d.name} className="flex items-center gap-1.5">
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: d.color }}
                    aria-hidden="true"
                  />
                  <span className="text-xs text-gray-600">{d.name}</span>
                  <span className="text-xs font-medium text-gray-800">{d.value}h</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
