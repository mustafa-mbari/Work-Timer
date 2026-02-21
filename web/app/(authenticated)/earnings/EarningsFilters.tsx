'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const PRESETS = [
  { label: 'Week', days: 7 },
  { label: 'Month', days: 30 },
  { label: 'Quarter', days: 90 },
  { label: 'Year', days: 365 },
] as const

function toIsoDate(d: Date): string {
  return d.toISOString().split('T')[0]
}

export default function EarningsFilters() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const dateFrom = searchParams.get('dateFrom') ?? ''
  const dateTo = searchParams.get('dateTo') ?? ''

  function applyPreset(days: number) {
    const to = new Date()
    const from = new Date()
    from.setDate(from.getDate() - (days - 1))
    navigate(toIsoDate(from), toIsoDate(to))
  }

  function navigate(from: string, to: string) {
    const sp = new URLSearchParams(searchParams.toString())
    if (from) sp.set('dateFrom', from)
    else sp.delete('dateFrom')
    if (to) sp.set('dateTo', to)
    else sp.delete('dateTo')
    startTransition(() => {
      router.push(`/earnings?${sp.toString()}`)
    })
  }

  const isFiltered = dateFrom || dateTo

  return (
    <div className="flex flex-wrap items-center gap-2">
      {PRESETS.map(p => (
        <Button
          key={p.label}
          variant="outline"
          size="sm"
          onClick={() => applyPreset(p.days)}
          disabled={isPending}
          className="h-8"
        >
          {p.label}
        </Button>
      ))}

      <Input
        type="date"
        value={dateFrom}
        onChange={e => navigate(e.target.value, dateTo)}
        className="w-36 h-8 text-sm"
        aria-label="From date"
        disabled={isPending}
      />
      <span className="text-stone-400 text-sm select-none">&ndash;</span>
      <Input
        type="date"
        value={dateTo}
        onChange={e => navigate(dateFrom, e.target.value)}
        className="w-36 h-8 text-sm"
        aria-label="To date"
        disabled={isPending}
      />

      {isFiltered && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('', '')}
          disabled={isPending}
          className="h-8 text-stone-500"
        >
          Clear
        </Button>
      )}
    </div>
  )
}
