'use client'

import { useTransition } from 'react'
import { useLocale } from 'next-intl'
import { Globe, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { Locale } from '@/i18n/config'

const LOCALES: { value: Locale; label: string; name: string }[] = [
  { value: 'en', label: 'EN', name: 'English' },
  { value: 'de', label: 'DE', name: 'Deutsch' },
]

export function LanguageSwitcher() {
  const locale = useLocale() as Locale
  const [isPending, startTransition] = useTransition()

  const handleSwitch = (next: Locale) => {
    if (next === locale) return
    startTransition(() => {
      document.cookie = `locale=${next}; path=/; max-age=31536000`
      window.location.reload()
    })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          disabled={isPending}
          aria-label="Language switcher"
          className={cn(
            'flex items-center gap-1 p-1.5 rounded-md transition-colors',
            'text-stone-400 hover:text-stone-600 hover:bg-stone-100',
            'dark:text-stone-500 dark:hover:text-stone-300 dark:hover:bg-[var(--dark-hover)]',
            isPending && 'opacity-50 cursor-wait',
          )}
        >
          <Globe className="h-4 w-4" />
          <span className="text-xs font-semibold">{locale.toUpperCase()}</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[120px]">
        {LOCALES.map(({ value, label, name }) => (
          <DropdownMenuItem
            key={value}
            onClick={() => handleSwitch(value)}
            className="flex items-center gap-2 cursor-pointer"
          >
            <Check className={cn('h-3.5 w-3.5 flex-shrink-0', locale !== value && 'opacity-0')} />
            <span className="font-semibold text-xs mr-1">{label}</span>
            <span className="text-stone-500 dark:text-stone-400">{name}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
