import { cn } from '@/lib/utils'

interface ContainerProps {
  children: React.ReactNode
  variant?: 'content' | 'marketing'
  className?: string
}

/**
 * Unified container for all pages.
 * - content: authenticated app pages (max-w-[1280px])
 * - marketing: public/landing pages (max-w-[1200px])
 */
export function Container({ children, variant = 'content', className }: ContainerProps) {
  return (
    <div
      className={cn(
        'mx-auto w-full px-8',
        variant === 'content' ? 'max-w-[1280px]' : 'max-w-[1200px]',
        className,
      )}
    >
      {children}
    </div>
  )
}
