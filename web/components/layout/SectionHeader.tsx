import { cn } from '@/lib/utils'

interface SectionHeaderProps {
  eyebrow?: string
  title: string
  subtitle?: string
  align?: 'left' | 'center'
  className?: string
}

/**
 * Standardized section header for landing page sections.
 * Provides consistent eyebrow label, heading, and subtitle.
 */
export function SectionHeader({
  eyebrow,
  title,
  subtitle,
  align = 'center',
  className,
}: SectionHeaderProps) {
  return (
    <div
      className={cn(
        'mb-16',
        align === 'center' ? 'text-center' : 'text-left',
        className,
      )}
    >
      {eyebrow && (
        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
          {eyebrow}
        </p>
      )}
      <h2 className="text-3xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
        {title}
      </h2>
      {subtitle && (
        <p className={cn(
          'mt-4 text-lg text-stone-500 dark:text-stone-400',
          align === 'center' && 'mx-auto max-w-2xl',
        )}>
          {subtitle}
        </p>
      )}
    </div>
  )
}
