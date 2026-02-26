'use client'

import { useState, useRef, useEffect, useTransition } from 'react'
import { useLocale } from 'next-intl'
import { Globe, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Locale } from '@/i18n/config'

const LOCALES: { value: Locale; label: string; name: string }[] = [
  { value: 'en', label: 'EN', name: 'English' },
  { value: 'de', label: 'DE', name: 'Deutsch' },
]

// compact prop accepted for backwards-compat with AppHeader; no effect (new design is always compact)
export function LanguageSwitcher(_props: { compact?: boolean } = {}) {
  const locale = useLocale() as Locale
  const [isPending, startTransition] = useTransition()
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Close dropdown on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const handleSwitch = (next: Locale) => {
    setOpen(false)
    if (next === locale) return
    startTransition(() => {
      document.cookie = `locale=${next}; path=/; max-age=31536000`
      window.location.reload()
    })
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        disabled={isPending}
        aria-label="Language switcher"
        aria-expanded={open}
        aria-haspopup="listbox"
        className={cn(
          'flex items-center gap-1 p-1.5 rounded-md transition-colors',
          'text-stone-400 hover:text-stone-600 hover:bg-stone-100',
          'dark:text-stone-500 dark:hover:text-stone-300 dark:hover:bg-[var(--dark-hover)]',
          isPending && 'opacity-50 cursor-wait',
        )}
      >
        <Globe className="h-4 w-4" />
        <span className="text-xs font-semibold" suppressHydrationWarning>
          {locale.toUpperCase()}
        </span>
      </button>

      {open && (
        <div
          role="listbox"
          aria-label="Select language"
          className="absolute right-0 top-full mt-1 z-50 min-w-[130px] rounded-lg border border-stone-200 dark:border-[var(--dark-border)] bg-white dark:bg-[var(--dark-card)] shadow-md py-1"
        >
          {LOCALES.map(({ value, label, name }) => (
            <button
              key={value}
              role="option"
              aria-selected={locale === value}
              onClick={() => handleSwitch(value)}
              className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-stone-50 dark:hover:bg-[var(--dark-hover)] transition-colors"
            >
              <Check
                className={cn(
                  'h-3.5 w-3.5 flex-shrink-0 text-indigo-600 dark:text-indigo-400',
                  locale !== value && 'opacity-0',
                )}
              />
              <span className="font-semibold text-xs text-stone-700 dark:text-stone-200">{label}</span>
              <span className="text-xs text-stone-400 dark:text-stone-500">{name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
