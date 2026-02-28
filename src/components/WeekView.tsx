import { useState, useMemo } from 'react'
import { addWeeks, format, isSameDay } from 'date-fns'
import { useEntriesRange } from '@/hooks/useEntries'
import { useProjects } from '@/hooks/useProjects'
import { getWeekDays, getWeekRange, formatDurationShort, formatDate, msToHours } from '@/utils/date'
import { useSettings } from '@/hooks/useSettings'
import { updateEntry, deleteEntry } from '@/storage'
import GoalProgress from './GoalProgress'
import ExportMenu from './ExportMenu'
import EntryEditModal from './EntryEditModal'
import AddEntryModal from './AddEntryModal'
import { ChevronLeftIcon, ChevronRightIcon, PlusIcon } from './Icons'
import { LoadingState } from './Spinner'
import type { TimeEntry } from '@/types'

export default function WeekView() {
  const [weekOffset, setWeekOffset] = useState(0)
  const currentDate = useMemo(() => addWeeks(new Date(), weekOffset), [weekOffset])

  const { activeProjects } = useProjects()
  const { settings } = useSettings()
  const weekStartsOn = (settings?.weekStartDay ?? 1) as 0 | 1
  const workingDays = settings?.workingDays ?? 5

  const { start, end } = getWeekRange(currentDate, weekStartsOn)
  const days = useMemo(
    () => getWeekDays(currentDate, weekStartsOn, workingDays),
    [currentDate, weekStartsOn, workingDays]
  )

  const { entries, loading, refetch } = useEntriesRange(formatDate(start), formatDate(end))

  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null)
  const [addingForDate, setAddingForDate] = useState<string | null>(null)

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

  if (loading) {
    return (
      <div className="flex flex-col px-5 py-4 gap-4">
        <LoadingState message="Loading week data..." />
      </div>
    )
  }

  return (
    <div className="flex flex-col px-5 py-4 gap-4">
      {/* Week Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setWeekOffset(w => w - 1)}
          className="p-2 rounded-lg hover:bg-stone-100 dark:hover:bg-dark-card text-stone-400 dark:text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 transition-colors"
          aria-label="Previous week"
        >
          <ChevronLeftIcon className="w-4 h-4" />
        </button>
        <div className="text-center">
          <div className="text-sm font-semibold text-stone-800 dark:text-stone-200">
            {format(start, 'MMM d')} – {format(end, 'MMM d, yyyy')}
          </div>
          {isCurrentWeek && <div className="text-[11px] font-medium text-indigo-500 dark:text-indigo-400 mt-0.5">This week</div>}
        </div>
        <button
          onClick={() => setWeekOffset(w => w + 1)}
          className="p-2 rounded-lg hover:bg-stone-100 dark:hover:bg-dark-card text-stone-400 dark:text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 transition-colors"
          aria-label="Next week"
        >
          <ChevronRightIcon className="w-4 h-4" />
        </button>
      </div>

      {/* Week Total */}
      <div className="bg-indigo-50 dark:bg-indigo-500/10 rounded-xl px-4 py-3 flex justify-between items-center">
        <span className="text-[11px] font-medium text-indigo-600 dark:text-indigo-400">Week Total</span>
        <div className="flex items-center gap-2.5">
          <span className="text-sm font-bold text-indigo-700 dark:text-indigo-300 tabular-nums">{formatDurationShort(weekTotal)}</span>
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

      {/* Edit Entry Modal */}
      {editingEntry && (
        <EntryEditModal
          entry={editingEntry}
          onSave={async (updated) => {
            await updateEntry(updated)
            await refetch()
            setEditingEntry(null)
          }}
          onDelete={async () => {
            await deleteEntry(editingEntry.id, editingEntry.date)
            await refetch()
            setEditingEntry(null)
          }}
          onClose={() => setEditingEntry(null)}
        />
      )}

      {/* Add Entry Modal */}
      {addingForDate && (
        <AddEntryModal
          date={addingForDate}
          onSave={async () => {
            await refetch()
            setAddingForDate(null)
          }}
          onClose={() => setAddingForDate(null)}
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
              className={`rounded-xl border p-3 transition-colors ${
                isToday
                  ? 'border-indigo-200 dark:border-indigo-500/30 bg-indigo-50/50 dark:bg-indigo-500/5'
                  : 'border-stone-100 dark:border-dark-border bg-white dark:bg-dark-card'
              }`}
              role="listitem"
            >
              <div className="flex justify-between items-center mb-1.5">
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-medium ${isToday ? 'text-indigo-700 dark:text-indigo-400' : 'text-stone-700 dark:text-stone-300'}`}>
                    {format(day, 'EEE')}
                  </span>
                  <span className="text-[11px] text-stone-400 dark:text-stone-400">{format(day, 'MMM d')}</span>
                  {isToday && (
                    <span className="text-[10px] font-medium bg-indigo-500 text-white px-2 py-0.5 rounded-full">
                      Today
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={`text-xs font-semibold tabular-nums ${dayTotal > 0 ? 'text-stone-700 dark:text-stone-300' : 'text-stone-300 dark:text-stone-600'}`}>
                    {dayTotal > 0 ? formatDurationShort(dayTotal) : '—'}
                  </span>
                  <button
                    onClick={() => setAddingForDate(key)}
                    className="p-0.5 rounded-md hover:bg-stone-200 dark:hover:bg-dark-elevated text-stone-400 dark:text-stone-400 hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors"
                    aria-label={`Add entry for ${key}`}
                  >
                    <PlusIcon className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {dayEntries.length > 0 && (
                <div className="flex gap-1 flex-wrap mt-1.5">
                  {dayEntries.map((entry) => {
                    const project = activeProjects.find(p => p.id === entry.projectId)
                    return (
                      <button
                        key={entry.id}
                        onClick={() => setEditingEntry(entry)}
                        className="text-[10px] font-medium px-2 py-0.5 rounded-full text-white truncate max-w-[100px] hover:opacity-75 transition-opacity"
                        style={{ backgroundColor: project?.color ?? '#A8A29E' }}
                        title={`${entry.description || project?.name || 'No project'} (${formatDurationShort(entry.duration)}) — click to edit`}
                      >
                        {formatDurationShort(entry.duration)}
                      </button>
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
