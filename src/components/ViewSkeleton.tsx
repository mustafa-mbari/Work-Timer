import { memo } from 'react'

const Bone = ({ className = '' }: { className?: string }) => (
  <div className={`bg-stone-200 dark:bg-dark-elevated rounded animate-pulse ${className}`} />
)

/** WeekView skeleton: header + 5 day rows */
export const WeekSkeleton = memo(function WeekSkeleton() {
  return (
    <div className="flex flex-col px-5 py-4 gap-4">
      {/* Week header */}
      <div className="flex items-center justify-between">
        <Bone className="h-4 w-24" />
        <div className="flex gap-2">
          <Bone className="h-8 w-8 rounded-lg" />
          <Bone className="h-8 w-8 rounded-lg" />
        </div>
      </div>
      {/* Week total */}
      <Bone className="h-5 w-32" />
      {/* Day rows */}
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Bone className="h-10 w-10 rounded-lg" />
          <div className="flex-1 flex flex-col gap-1.5">
            <Bone className="h-3 w-20" />
            <Bone className="h-2.5 w-14" />
          </div>
          <Bone className="h-3 w-12" />
        </div>
      ))}
    </div>
  )
})

/** StatsView skeleton: summary cards + chart + legend */
export const StatsSkeleton = memo(function StatsSkeleton() {
  return (
    <div className="flex flex-col px-5 py-4 gap-4">
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-1.5 p-3 rounded-xl bg-stone-100 dark:bg-dark-card">
            <Bone className="h-2.5 w-10" />
            <Bone className="h-5 w-14" />
          </div>
        ))}
      </div>
      {/* Chart area */}
      <Bone className="h-36 w-full rounded-xl" />
      {/* Legend */}
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Bone key={i} className="h-3 w-16 rounded-full" />
        ))}
      </div>
      {/* Heatmap placeholder */}
      <Bone className="h-24 w-full rounded-xl" />
    </div>
  )
})

/** SettingsView skeleton: tab bar + setting rows */
export const SettingsSkeleton = memo(function SettingsSkeleton() {
  return (
    <div className="flex flex-col px-5 py-4 gap-4">
      {/* Tab bar */}
      <div className="flex gap-1 bg-stone-100 dark:bg-dark-card rounded-xl p-1">
        {Array.from({ length: 4 }).map((_, i) => (
          <Bone key={i} className="flex-1 h-8 rounded-lg" />
        ))}
      </div>
      {/* Setting rows */}
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center justify-between py-2">
          <Bone className="h-3.5 w-28" />
          <Bone className="h-8 w-20 rounded-lg" />
        </div>
      ))}
    </div>
  )
})
