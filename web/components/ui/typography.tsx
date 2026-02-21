import { cn } from '@/lib/utils'

interface TextProps {
  children: React.ReactNode
  className?: string
  as?: React.ElementType
}

export function H1({ children, className, as: Tag = 'h1' }: TextProps) {
  return (
    <Tag className={cn('text-4xl font-bold tracking-tight text-stone-900 dark:text-stone-100', className)}>
      {children}
    </Tag>
  )
}

export function H2({ children, className, as: Tag = 'h2' }: TextProps) {
  return (
    <Tag className={cn('text-3xl font-bold tracking-tight text-stone-900 dark:text-stone-100', className)}>
      {children}
    </Tag>
  )
}

export function H3({ children, className, as: Tag = 'h3' }: TextProps) {
  return (
    <Tag className={cn('text-2xl font-semibold text-stone-900 dark:text-stone-100', className)}>
      {children}
    </Tag>
  )
}

export function H4({ children, className, as: Tag = 'h4' }: TextProps) {
  return (
    <Tag className={cn('text-xl font-semibold text-stone-900 dark:text-stone-100', className)}>
      {children}
    </Tag>
  )
}

export function H5({ children, className, as: Tag = 'h5' }: TextProps) {
  return (
    <Tag className={cn('text-lg font-medium text-stone-900 dark:text-stone-100', className)}>
      {children}
    </Tag>
  )
}

export function Body({ children, className, as: Tag = 'p' }: TextProps) {
  return (
    <Tag className={cn('text-base text-stone-700 dark:text-stone-300 leading-relaxed', className)}>
      {children}
    </Tag>
  )
}

export function Muted({ children, className, as: Tag = 'p' }: TextProps) {
  return (
    <Tag className={cn('text-sm text-stone-500 dark:text-stone-400', className)}>
      {children}
    </Tag>
  )
}

export function Caption({ children, className, as: Tag = 'span' }: TextProps) {
  return (
    <Tag className={cn('text-xs text-stone-400 dark:text-stone-500', className)}>
      {children}
    </Tag>
  )
}
