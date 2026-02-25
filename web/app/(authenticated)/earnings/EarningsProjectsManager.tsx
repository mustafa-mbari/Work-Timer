'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { DollarSign } from 'lucide-react'

interface EarningsItem {
  id: string
  name: string
  color: string
  hourly_rate: number | null
  earnings_enabled: boolean
}

interface Props {
  items: EarningsItem[]
  currency: string
  groupBy: 'tag' | 'project'
}

export default function EarningsProjectsManager({ items: initialItems, currency, groupBy }: Props) {
  const router = useRouter()
  const [items, setItems] = useState(initialItems)
  const [toggling, setToggling] = useState<string | null>(null)

  const apiPath = groupBy === 'tag' ? '/api/tags' : '/api/projects'
  const label = groupBy === 'tag' ? 'Tag' : 'Project'

  async function handleToggle(id: string, current: boolean) {
    setToggling(id)
    const prev = items
    setItems(items.map(p => p.id === id ? { ...p, earnings_enabled: !current } : p))

    const res = await fetch(`${apiPath}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ earnings_enabled: !current }),
    })
    setToggling(null)

    if (res.ok) {
      router.refresh()
    } else {
      setItems(prev)
      toast.error(`Failed to update ${label.toLowerCase()}`)
    }
  }

  return (
    <div className="rounded-2xl bg-white dark:bg-[var(--dark-card)] border border-stone-100 dark:border-[var(--dark-border)] shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-stone-100 dark:border-[var(--dark-border)]">
        <div className="flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-emerald-500" />
          <h3 className="font-semibold text-stone-800 dark:text-stone-100 text-sm">Manage {label} Earnings</h3>
        </div>
        <p className="text-xs text-stone-400 dark:text-stone-500 mt-1">Toggle which {label.toLowerCase()}s are included in earnings calculations</p>
      </div>
      <div className="divide-y divide-stone-50 dark:divide-[var(--dark-border)]">
        {items.map(item => (
          <div key={item.id} className="flex items-center justify-between px-5 py-3">
            <div className="flex items-center gap-3 min-w-0">
              <span
                className="h-3 w-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-sm text-stone-700 dark:text-stone-200 truncate">{item.name}</span>
              {item.hourly_rate != null && (
                <span className="text-xs text-stone-400 dark:text-stone-500 flex-shrink-0">{currency} {item.hourly_rate}/hr</span>
              )}
            </div>
            <button
              onClick={() => handleToggle(item.id, item.earnings_enabled)}
              disabled={toggling === item.id}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors flex-shrink-0 ${
                item.earnings_enabled
                  ? 'bg-emerald-500'
                  : 'bg-stone-200 dark:bg-stone-700'
              } ${toggling === item.id ? 'opacity-60' : ''}`}
            >
              <span
                className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${
                  item.earnings_enabled ? 'translate-x-4' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
        ))}
        {items.length === 0 && (
          <div className="px-5 py-6 text-center text-sm text-stone-400 dark:text-stone-500">
            No {label.toLowerCase()}s yet
          </div>
        )}
      </div>
    </div>
  )
}
