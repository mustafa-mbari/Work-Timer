'use client'

import type { OwnStats } from './utils'

export type { OwnStats }

interface Props {
  ownStats: OwnStats
  openShareCount?: number
  submittedShareCount?: number
  sharesLoading?: boolean
  hasSchedule?: boolean
}

function fmtH(hours: number): string {
  if (hours === 0) return '0'
  if (hours < 10) return hours.toFixed(1)
  return Math.round(hours).toString()
}

export default function MemberStatsCard({
  ownStats,
  openShareCount = 0,
  submittedShareCount = 0,
  sharesLoading = false,
  hasSchedule = false,
}: Props) {
  const periods = [
    { label: 'Today',      hours: ownStats.today_hours,  target: 8   },
    { label: 'This Week',  hours: ownStats.week_hours,   target: 40  },
    { label: 'This Month', hours: ownStats.month_hours,  target: 160 },
  ]

  // Timesheet card colours & values
  const tsColor =
    openShareCount > 0 ? 'text-amber-500 dark:text-amber-400' :
    submittedShareCount > 0 ? 'text-indigo-500 dark:text-indigo-400' :
    'text-emerald-500 dark:text-emerald-400'

  const tsBarColor =
    openShareCount > 0 ? 'bg-amber-400 dark:bg-amber-500' :
    submittedShareCount > 0 ? 'bg-indigo-300 dark:bg-indigo-500' :
    'bg-emerald-400 dark:bg-emerald-500'

  const tsTrackColor =
    openShareCount > 0 ? 'bg-amber-100 dark:bg-amber-900/30' :
    submittedShareCount > 0 ? 'bg-indigo-100 dark:bg-indigo-900/30' :
    'bg-emerald-100 dark:bg-emerald-900/30'

  const tsValue =
    openShareCount > 0 ? openShareCount.toString() :
    submittedShareCount > 0 ? submittedShareCount.toString() :
    '✓'

  const tsLabel =
    openShareCount > 0 ? (openShareCount === 1 ? 'pending request' : 'pending requests') :
    submittedShareCount > 0 ? 'under review' :
    hasSchedule ? 'all caught up' : 'no requests'

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {/* Hours cards — V11 style */}
      {periods.map(p => {
        const pct = Math.min(p.hours / p.target, 1)
        const over = p.hours > p.target
        return (
          <div
            key={p.label}
            className="bg-white dark:bg-[var(--dark-card)] border border-stone-100 dark:border-[var(--dark-border)] rounded-2xl p-4 space-y-3"
          >
            <span className="text-[10px] font-semibold text-stone-400 dark:text-stone-500 uppercase tracking-wider">
              {p.label}
            </span>
            <div>
              <div className="text-3xl font-black text-stone-800 dark:text-stone-100 tabular-nums leading-none">
                {fmtH(p.hours)}
                <span className="text-base font-normal text-stone-400 dark:text-stone-500 ml-1">h</span>
              </div>
              <div className="text-xs text-stone-400 dark:text-stone-500 mt-1">
                {over ? `+${fmtH(p.hours - p.target)}h over target` : `of ${p.target}h`}
              </div>
            </div>
            <div className="h-1.5 bg-stone-100 dark:bg-stone-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${over ? 'bg-emerald-400 dark:bg-emerald-500' : 'bg-indigo-400 dark:bg-indigo-500'}`}
                style={{ width: `${Math.min(pct * 100, 100)}%` }}
              />
            </div>
          </div>
        )
      })}

      {/* Timesheet status card */}
      <div className="bg-white dark:bg-[var(--dark-card)] border border-stone-100 dark:border-[var(--dark-border)] rounded-2xl p-4 space-y-3">
        <span className="text-[10px] font-semibold text-stone-400 dark:text-stone-500 uppercase tracking-wider">
          Timesheets
        </span>

        {sharesLoading ? (
          <div className="space-y-2 pt-1">
            <div className="h-8 w-10 bg-stone-100 dark:bg-stone-800 rounded-lg animate-pulse" />
            <div className="h-3 w-24 bg-stone-100 dark:bg-stone-800 rounded animate-pulse" />
          </div>
        ) : (
          <>
            <div>
              <div className={`text-3xl font-black tabular-nums leading-none ${tsColor}`}>
                {tsValue}
              </div>
              <div className="text-xs text-stone-400 dark:text-stone-500 mt-1">{tsLabel}</div>
            </div>
            <div className={`h-1.5 ${tsTrackColor} rounded-full overflow-hidden`}>
              <div
                className={`h-full rounded-full ${tsBarColor}`}
                style={{ width: '100%' }}
              />
            </div>
          </>
        )}
      </div>
    </div>
  )
}
