'use client'

import type { ExportQuotaItem } from '@/lib/shared/types'

interface Props {
  item: ExportQuotaItem | undefined
  loading: boolean
}

export default function ExportQuotaBadge({ item, loading }: Props) {
  if (loading || !item) {
    return <span className="text-xs text-stone-400 dark:text-stone-500 tabular-nums">...</span>
  }

  const isExhausted = item.remaining === 0
  const isWarning = item.remaining <= 2 && item.remaining > 0

  return (
    <span
      className={`text-xs tabular-nums ${
        isExhausted
          ? 'text-rose-500 dark:text-rose-400 font-medium'
          : isWarning
          ? 'text-amber-500 dark:text-amber-400'
          : 'text-stone-400 dark:text-stone-500'
      }`}
      title={`${item.used} of ${item.limit} exports used this month`}
    >
      {item.used}/{item.limit} this month
    </span>
  )
}
