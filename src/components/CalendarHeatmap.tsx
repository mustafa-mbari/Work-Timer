import { useMemo } from 'react'
import { format, getDay, isToday } from 'date-fns'
import { useEntriesRange } from '@/hooks/useEntries'
import { getMonthDays, formatDate, formatDurationShort } from '@/utils/date'

interface Props {
  year: number
  month: number
  onPrev: () => void
  onNext: () => void
}

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

function getHeatColor(ms: number): string {
  const h = ms / 3_600_000
  if (h === 0) return 'bg-stone-100 dark:bg-stone-700/50'
  if (h < 2)   return 'bg-indigo-100 dark:bg-indigo-900/60'
  if (h < 4)   return 'bg-indigo-300 dark:bg-indigo-700'
  if (h < 6)   return 'bg-indigo-500 dark:bg-indigo-500'
  return        'bg-indigo-600 dark:bg-indigo-400'
}

const LEGEND = [
  { label: '0h',   color: 'bg-stone-100 dark:bg-stone-700/50' },
  { label: '<2h',  color: 'bg-indigo-100 dark:bg-indigo-900/60' },
  { label: '<4h',  color: 'bg-indigo-300 dark:bg-indigo-700' },
  { label: '<6h',  color: 'bg-indigo-500 dark:bg-indigo-500' },
  { label: '6h+',  color: 'bg-indigo-600 dark:bg-indigo-400' },
]

export default function CalendarHeatmap({ year, month, onPrev, onNext }: Props) {
  const days = useMemo(() => getMonthDays(year, month), [year, month])
  const start = formatDate(days[0])
  const end = formatDate(days[days.length - 1])

  const { entries } = useEntriesRange(start, end)

  const msPerDay = useMemo(() => {
    const map = new Map<string, number>()
    for (const e of entries) {
      map.set(e.date, (map.get(e.date) ?? 0) + e.duration)
    }
    return map
  }, [entries])

  // Mon-based leading blanks: Mon=0, Tue=1, ..., Sun=6
  const firstDay = days[0]
  const leadingBlanks = (getDay(firstDay) - 1 + 7) % 7

  const headerLabel = format(new Date(year, month, 1), 'MMMM yyyy')
  const isCurrentMonth = (() => {
    const now = new Date()
    return now.getFullYear() === year && now.getMonth() === month
  })()

  return (
    <div className="bg-white dark:bg-dark-card rounded-xl p-4 border border-stone-100 dark:border-dark-border">
      {/* Month navigation */}
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={onPrev}
          className="w-7 h-7 flex items-center justify-center rounded-lg text-stone-400 hover:text-stone-600 hover:bg-stone-100 dark:hover:text-stone-300 dark:hover:bg-dark-hover transition-colors"
          aria-label="Previous month"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <path d="M9 11L5 7l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <span className="text-xs font-semibold text-stone-700 dark:text-stone-300">{headerLabel}</span>
        <button
          onClick={onNext}
          disabled={isCurrentMonth}
          className="w-7 h-7 flex items-center justify-center rounded-lg text-stone-400 hover:text-stone-600 hover:bg-stone-100 dark:hover:text-stone-300 dark:hover:bg-dark-hover transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          aria-label="Next month"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <path d="M5 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>

      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {DAY_LABELS.map((label, i) => (
          <div key={i} className="text-[9px] font-medium text-stone-400 dark:text-stone-500 text-center">
            {label}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-1">
        {/* Leading blank cells */}
        {Array.from({ length: leadingBlanks }).map((_, i) => (
          <div key={`blank-${i}`} />
        ))}

        {/* Day cells */}
        {days.map(day => {
          const key = formatDate(day)
          const ms = msPerDay.get(key) ?? 0
          const tooltip = `${format(day, 'EEE d MMM')}${ms > 0 ? ` — ${formatDurationShort(ms)}` : ''}`
          const today = isToday(day)

          return (
            <div
              key={key}
              title={tooltip}
              className={[
                'aspect-square rounded-sm',
                getHeatColor(ms),
                today ? 'ring-2 ring-indigo-500 ring-offset-1 ring-offset-white dark:ring-offset-dark-card' : '',
              ].join(' ')}
              role="gridcell"
              aria-label={tooltip}
            />
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-2 mt-3 justify-end">
        {LEGEND.map(item => (
          <div key={item.label} className="flex items-center gap-1">
            <div className={`w-2.5 h-2.5 rounded-sm ${item.color}`} aria-hidden="true" />
            <span className="text-[9px] text-stone-400 dark:text-stone-500">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
