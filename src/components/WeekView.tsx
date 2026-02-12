import { useState, useMemo } from 'react'
import { addWeeks, format, isSameDay } from 'date-fns'
import { useEntriesRange } from '@/hooks/useEntries'
import { useProjects } from '@/hooks/useProjects'
import { getWeekDays, getWeekRange, formatDurationShort, formatDate, msToHours } from '@/utils/date'
import { useSettings } from '@/hooks/useSettings'
import GoalProgress from './GoalProgress'
import ExportMenu from './ExportMenu'
import type { TimeEntry } from '@/types'

export default function WeekView() {
  const [weekOffset, setWeekOffset] = useState(0)
  const currentDate = useMemo(() => addWeeks(new Date(), weekOffset), [weekOffset])

  const { activeProjects } = useProjects()
  const { settings } = useSettings()
  const weekStartsOn = (settings?.weekStartDay ?? 1) as 0 | 1
  const workingDays = settings?.workingDays ?? 5

  const { start, end } = getWeekRange(currentDate, weekStartsOn)
  const days = getWeekDays(currentDate, weekStartsOn, workingDays)

  const { entries } = useEntriesRange(formatDate(start), formatDate(end))

  const entriesByDay = useMemo(() => {
    const map = new Map<string, TimeEntry[]>()
    for (const day of days) {
      const key = formatDate(day)
      map.set(key, entries.filter(e => e.date === key))
    }
    return map
  }, [entries, days])

  const weekTotal = entries.reduce((sum, e) => sum + e.duration, 0)

  const isCurrentWeek = weekOffset === 0
  const today = new Date()

  return (
    <div className="flex flex-col p-4 gap-3">
      {/* Week Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setWeekOffset(w => w - 1)}
          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"
          aria-label="Previous week"
        >
          ◀
        </button>
        <div className="text-center">
          <div className="text-sm font-medium text-gray-800">
            {format(start, 'MMM d')} – {format(end, 'MMM d, yyyy')}
          </div>
          {isCurrentWeek && <div className="text-xs text-blue-600">This week</div>}
        </div>
        <button
          onClick={() => setWeekOffset(w => w + 1)}
          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"
          aria-label="Next week"
        >
          ▶
        </button>
      </div>

      {/* Week Total */}
      <div className="bg-blue-50 rounded-lg px-3 py-2 flex justify-between items-center">
        <span className="text-xs text-blue-600 font-medium">Week Total</span>
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-blue-700">{formatDurationShort(weekTotal)}</span>
          <ExportMenu
            entries={entries}
            projects={activeProjects}
            filename={`work-timer-${formatDate(start)}-${formatDate(end)}`}
          />
        </div>
      </div>

      {/* Weekly Goal */}
      {settings?.weeklyTarget && (
        <GoalProgress
          label="Weekly Goal"
          current={msToHours(weekTotal)}
          target={settings.weeklyTarget}
        />
      )}

      {/* Days */}
      <div className="flex flex-col gap-2" role="list" aria-label="Weekly time entries">
        {days.map((day) => {
          const key = formatDate(day)
          const dayEntries = entriesByDay.get(key) ?? []
          const dayTotal = dayEntries.reduce((sum, e) => sum + e.duration, 0)
          const isToday = isSameDay(day, today)

          return (
            <div
              key={key}
              className={`rounded-lg border p-2.5 ${
                isToday ? 'border-blue-300 bg-blue-50/50' : 'border-gray-100'
              }`}
              role="listitem"
            >
              <div className="flex justify-between items-center mb-1">
                <div className="flex items-center gap-1.5">
                  <span className={`text-sm font-medium ${isToday ? 'text-blue-700' : 'text-gray-700'}`}>
                    {format(day, 'EEE')}
                  </span>
                  <span className="text-xs text-gray-400">{format(day, 'MMM d')}</span>
                  {isToday && <span className="text-[10px] bg-blue-600 text-white px-1.5 py-0.5 rounded-full">Today</span>}
                </div>
                <span className={`text-xs font-medium ${dayTotal > 0 ? 'text-gray-700' : 'text-gray-300'}`}>
                  {dayTotal > 0 ? formatDurationShort(dayTotal) : '—'}
                </span>
              </div>

              {dayEntries.length > 0 && (
                <div className="flex gap-1 flex-wrap mt-1">
                  {dayEntries.map((entry) => {
                    const project = activeProjects.find(p => p.id === entry.projectId)
                    return (
                      <span
                        key={entry.id}
                        className="text-[10px] px-1.5 py-0.5 rounded-full text-white truncate max-w-[100px]"
                        style={{ backgroundColor: project?.color ?? '#9ca3af' }}
                        title={`${entry.description || project?.name || 'No project'} (${formatDurationShort(entry.duration)})`}
                      >
                        {formatDurationShort(entry.duration)}
                      </span>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
