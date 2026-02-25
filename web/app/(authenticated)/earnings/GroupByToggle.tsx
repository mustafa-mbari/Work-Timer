'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Tag, FolderKanban } from 'lucide-react'

interface Props {
  groupBy: 'tag' | 'project'
}

export default function GroupByToggle({ groupBy }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()

  function handleToggle(value: 'tag' | 'project') {
    if (value === groupBy) return
    const params = new URLSearchParams(searchParams.toString())
    if (value === 'tag') {
      params.delete('groupBy')
    } else {
      params.set('groupBy', value)
    }
    const qs = params.toString()
    router.push(`/earnings${qs ? `?${qs}` : ''}`)
  }

  return (
    <div className="inline-flex rounded-lg border border-stone-200 dark:border-[var(--dark-border)] bg-stone-50 dark:bg-[var(--dark-elevated)] p-0.5">
      <button
        onClick={() => handleToggle('tag')}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
          groupBy === 'tag'
            ? 'bg-white dark:bg-[var(--dark-card)] text-stone-900 dark:text-stone-100 shadow-sm'
            : 'text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-300'
        }`}
      >
        <Tag className="h-3.5 w-3.5" />
        By Tag
      </button>
      <button
        onClick={() => handleToggle('project')}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
          groupBy === 'project'
            ? 'bg-white dark:bg-[var(--dark-card)] text-stone-900 dark:text-stone-100 shadow-sm'
            : 'text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-300'
        }`}
      >
        <FolderKanban className="h-3.5 w-3.5" />
        By Project
      </button>
    </div>
  )
}
