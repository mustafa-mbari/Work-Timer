interface GoalProgressProps {
  label: string
  current: number // hours
  target: number // hours
}

export default function GoalProgress({ label, current, target }: GoalProgressProps) {
  const progress = Math.min(current / target, 1)
  const percent = Math.round(progress * 100)

  const color = progress >= 1 ? 'bg-green-500' : progress >= 0.7 ? 'bg-blue-500' : progress >= 0.4 ? 'bg-amber-500' : 'bg-red-400'
  const textColor = progress >= 1 ? 'text-green-700' : progress >= 0.7 ? 'text-blue-700' : progress >= 0.4 ? 'text-amber-700' : 'text-red-600'

  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between items-center">
        <span className="text-[10px] text-gray-500">{label}</span>
        <span className={`text-[10px] font-medium ${textColor}`}>
          {current.toFixed(1)}h / {target}h ({percent}%)
        </span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  )
}
