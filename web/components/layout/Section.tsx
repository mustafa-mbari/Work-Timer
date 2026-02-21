import { cn } from '@/lib/utils'

interface SectionProps {
  children: React.ReactNode
  id?: string
  className?: string
  /** Compact variant uses py-16 instead of py-24 */
  compact?: boolean
}

/**
 * Landing page section wrapper.
 * Provides consistent vertical padding between major sections.
 */
export function Section({ children, id, className, compact = false }: SectionProps) {
  return (
    <section
      id={id}
      className={cn(
        compact ? 'py-16' : 'py-24',
        className,
      )}
    >
      {children}
    </section>
  )
}
