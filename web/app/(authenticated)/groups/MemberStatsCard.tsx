'use client'

import { Clock } from 'lucide-react'

export interface OwnStats {
  today_hours: number
  week_hours: number
  month_hours: number
}

interface Props {
  ownStats: OwnStats
}

function formatHours(h: number): string {
  return h < 0.1 ? '0h' : h < 10 ? `${h.toFixed(1)}h` : `${Math.round(h)}h`
}

export default function MemberStatsCard({ ownStats }: Props) {
  return (
    <div className="rounded-xl bg-white dark:bg-[var(--dark-card)] border border-stone-100 dark:border-[var(--dark-border)] shadow-sm p-4">
      <div className="flex items-center gap-1.5 mb-3">
        <Clock className="h-3.5 w-3.5 text-indigo-500" />
        <span className="text-xs font-medium text-stone-500 dark:text-stone-400 uppercase tracking-wider">My Hours</span>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div className="text-center">
          <p className="text-xl font-bold text-stone-800 dark:text-stone-100 tabular-nums">
            {formatHours(ownStats.today_hours)}
          </p>
          <p className="text-xs text-stone-400 mt-0.5">Today</p>
        </div>
        <div className="text-center border-x border-stone-100 dark:border-[var(--dark-border)]">
          <p className="text-xl font-bold text-stone-800 dark:text-stone-100 tabular-nums">
            {formatHours(ownStats.week_hours)}
          </p>
          <p className="text-xs text-stone-400 mt-0.5">This Week</p>
        </div>
        <div className="text-center">
          <p className="text-xl font-bold text-stone-800 dark:text-stone-100 tabular-nums">
            {formatHours(ownStats.month_hours)}
          </p>
          <p className="text-xs text-stone-400 mt-0.5">This Month</p>
        </div>
      </div>
    </div>
  )
}
