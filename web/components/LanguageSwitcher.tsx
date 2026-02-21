'use client'

import { useTransition } from 'react'
import { useLocale } from 'next-intl'
import { cn } from '@/lib/utils'
import type { Locale } from '@/i18n/config'

const LOCALES: { value: Locale; label: string }[] = [
  { value: 'en', label: 'EN' },
  { value: 'de', label: 'DE' },
]

interface Props {
  compact?: boolean
}

export function LanguageSwitcher({ compact = false }: Props) {
  const locale = useLocale() as Locale
  const [isPending, startTransition] = useTransition()

  const handleSwitch = (next: Locale) => {
    if (next === locale) return
    startTransition(() => {
      // Set cookie and reload to apply new locale (cookie-based strategy)
      document.cookie = `locale=${next}; path=/; max-age=31536000`
      window.location.reload()
    })
  }

  return (
    <div
      className={cn(
        'flex items-center gap-0.5 rounded-lg p-1',
        !compact && 'bg-stone-100 dark:bg-[var(--dark-elevated)]',
      )}
      role="group"
      aria-label="Language switcher"
    >
      {LOCALES.map(({ value, label }) => (
        <button
          key={value}
          onClick={() => handleSwitch(value)}
          disabled={isPending}
          aria-pressed={locale === value}
          className={cn(
            'rounded-md px-2 py-1 text-xs font-semibold transition-colors',
            locale === value
              ? 'bg-white text-stone-900 shadow-sm dark:bg-[var(--dark-card)] dark:text-stone-100'
              : 'text-stone-400 hover:text-stone-600 dark:text-stone-500 dark:hover:text-stone-300',
            isPending && 'opacity-50 cursor-wait',
          )}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
