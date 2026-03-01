import { useMemo, useState } from 'react'
import { PieChart, Pie, Cell } from 'recharts'
import { useEntries, useEntriesRange } from '@/hooks/useEntries'
import { useProjects } from '@/hooks/useProjects'
import { useSettings } from '@/hooks/useSettings'
import { getWeekRange, formatDate, formatDurationShort, msToHours } from '@/utils/date'
import { addMonths } from 'date-fns'
import ExportMenu from './ExportMenu'
import WeeklyChart from './WeeklyChart'
import CalendarHeatmap from './CalendarHeatmap'
import { usePremium } from '@/hooks/usePremium'
import UpgradePrompt from './UpgradePrompt'

export default function StatsView() {
  const { entries: todayEntries, totalDuration: todayTotal } = useEntries()
  const { activeProjects } = useProjects()
  const [monthOffset, setMonthOffset] = useState(0)
  const [showUpgrade, setShowUpgrade] = useState(false)
  const { isPremium, isGuest } = usePremium()
  const { settings } = useSettings()
  const displayDate = addMonths(new Date(), monthOffset)
  const displayYear = displayDate.getFullYear()
  const displayMonth = displayDate.getMonth()

  const weekStartsOn = (settings?.weekStartDay ?? 1) as 0 | 1
  const workingDays = settings?.workingDays ?? 5
  const { start, end } = getWeekRange(new Date(), weekStartsOn)
  const { entries: weekEntries } = useEntriesRange(formatDate(start), formatDate(end))

  const weekTotal = weekEntries.reduce((sum, e) => sum + e.duration, 0)
  const daysWithEntries = new Set(weekEntries.map(e => e.date)).size
  const avgDaily = daysWithEntries > 0 ? weekTotal / daysWithEntries : 0

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
        color: project?.color ?? '#A8A29E',
      }
    })
  }, [todayEntries, activeProjects])

  return (
    <div className="flex flex-col px-5 py-4 gap-5">
      <div className="flex justify-between items-center">
        <h2 className="text-sm font-semibold text-stone-800 dark:text-stone-200">Statistics</h2>
        <ExportMenu
          entries={weekEntries}
          projects={activeProjects}
          filename={`work-timer-week-${formatDate(start)}`}
        />
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-2.5">
        <div className="bg-indigo-50 dark:bg-indigo-500/10 rounded-xl p-3 text-center">
          <div className="text-lg font-bold text-indigo-700 dark:text-indigo-300 tabular-nums">{formatDurationShort(todayTotal)}</div>
          <div className="text-[10px] font-medium text-indigo-500 dark:text-indigo-400 mt-0.5">Today</div>
        </div>
        <div className="bg-emerald-50 dark:bg-emerald-500/10 rounded-xl p-3 text-center">
          <div className="text-lg font-bold text-emerald-700 dark:text-emerald-300 tabular-nums">{formatDurationShort(weekTotal)}</div>
          <div className="text-[10px] font-medium text-emerald-500 dark:text-emerald-400 mt-0.5">This Week</div>
        </div>
        <div className="bg-purple-50 dark:bg-purple-500/10 rounded-xl p-3 text-center">
          <div className="text-lg font-bold text-purple-700 dark:text-purple-300 tabular-nums">{formatDurationShort(avgDaily)}</div>
          <div className="text-[10px] font-medium text-purple-500 dark:text-purple-400 mt-0.5">Daily Avg</div>
        </div>
      </div>

      {/* Weekly Stacked Chart */}
      <WeeklyChart
        entries={weekEntries}
        projects={activeProjects}
        weekStartsOn={weekStartsOn}
        workingDays={workingDays}
      />

      {/* Today by Project */}
      {pieData.length > 0 && (
        <div>
          <h3 className="text-[11px] font-semibold text-stone-500 dark:text-stone-400 mb-2.5 uppercase tracking-wider">Today by Project</h3>
          <div className="flex items-center gap-5 bg-white dark:bg-dark-card rounded-xl p-4 border border-stone-100 dark:border-dark-border">
            <div className="w-24 h-24 flex-shrink-0">
              <PieChart width={96} height={96}>
                <Pie
                  data={pieData}
                  dataKey="value"
                  cx="50%"
                  cy="50%"
                  innerRadius={22}
                  outerRadius={42}
                  paddingAngle={3}
                  strokeWidth={0}
                >
                  {pieData.map((d, i) => (
                    <Cell key={i} fill={d.color} />
                  ))}
                </Pie>
              </PieChart>
            </div>
            <div className="flex flex-col gap-2">
              {pieData.map((d) => (
                <div key={d.name} className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: d.color }}
                    aria-hidden="true"
                  />
                  <span className="text-xs text-stone-500 dark:text-stone-400">{d.name}</span>
                  <span className="text-xs font-semibold text-stone-700 dark:text-stone-300 tabular-nums">{d.value}h</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Monthly Overview Heatmap — Premium only */}
      {isPremium ? (
        <div>
          <h3 className="text-[11px] font-semibold text-stone-500 dark:text-stone-400 mb-2.5 uppercase tracking-wider">Monthly Overview</h3>
          <CalendarHeatmap
            year={displayYear}
            month={displayMonth}
            onPrev={() => setMonthOffset(o => o - 1)}
            onNext={() => setMonthOffset(o => o + 1)}
          />
        </div>
      ) : (
        <div>
          <h3 className="text-[11px] font-semibold text-stone-500 dark:text-stone-400 mb-2.5 uppercase tracking-wider">Monthly Overview</h3>
          <button
            onClick={() => setShowUpgrade(true)}
            className="w-full rounded-xl border border-dashed border-stone-200 dark:border-dark-border p-4 flex flex-col items-center gap-2 text-center hover:bg-stone-50 dark:hover:bg-dark-hover transition-colors"
          >
            <svg className="w-5 h-5 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <span className="text-xs font-medium text-stone-500 dark:text-stone-400">{isGuest ? 'Log in to unlock advanced analytics' : 'Advanced analytics available with Premium'}</span>
          </button>
          <UpgradePrompt
            isOpen={showUpgrade}
            feature={isGuest ? 'Advanced analytics' : 'Monthly heatmap & advanced analytics'}
            onClose={() => setShowUpgrade(false)}
            isGuest={isGuest}
          />
        </div>
      )}
    </div>
  )
}
