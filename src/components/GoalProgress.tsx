import { memo } from 'react'

interface GoalProgressProps {
  label: string
  current: number // hours
  target: number // hours
}

export default memo(function GoalProgress({ label, current, target }: GoalProgressProps) {
  const progress = Math.min(current / target, 1)
  const percent = Math.round(progress * 100)

  const barColor = progress >= 1
    ? 'bg-gradient-to-r from-emerald-600 to-emerald-400'
    : progress >= 0.7
      ? 'bg-gradient-to-r from-indigo-600 to-indigo-400'
      : progress >= 0.4
        ? 'bg-gradient-to-r from-amber-500 to-amber-400'
        : 'bg-gradient-to-r from-rose-600 to-rose-400'

  const textColor = progress >= 1
    ? 'text-emerald-600 dark:text-emerald-400'
    : progress >= 0.7
      ? 'text-indigo-600 dark:text-indigo-400'
      : progress >= 0.4
        ? 'text-amber-600 dark:text-amber-400'
        : 'text-rose-500 dark:text-rose-400'

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex justify-between items-center">
        <span className="text-[11px] font-medium text-stone-500 dark:text-stone-500">{label}</span>
        <span className={`text-[11px] font-semibold ${textColor}`}>
          {current.toFixed(1)}h / {target}h ({percent}%)
        </span>
      </div>
      <div
        className="h-2.5 bg-stone-200 dark:bg-dark-elevated rounded-full overflow-hidden"
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  )
})
