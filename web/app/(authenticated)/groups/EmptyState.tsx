import type { ReactNode } from 'react'

interface EmptyStateProps {
  icon: ReactNode
  title: string
  description?: string
  action?: ReactNode
  variant?: 'default' | 'success' | 'dashed'
}

export function EmptyState({ icon, title, description, action, variant = 'default' }: EmptyStateProps) {
  const baseClasses = 'rounded-xl p-8 text-center'
  const variantClasses = {
    default: 'bg-white dark:bg-[var(--dark-card)] border border-stone-100 dark:border-[var(--dark-border)]',
    success: 'bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-800/30',
    dashed: 'border-2 border-dashed border-stone-200 dark:border-[var(--dark-border)]',
  }

  return (
    <div className={`${baseClasses} ${variantClasses[variant]}`}>
      <div className="flex justify-center mb-2 text-stone-300 dark:text-stone-600">
        {icon}
      </div>
      <p className={`text-sm font-medium ${
        variant === 'success'
          ? 'text-emerald-700 dark:text-emerald-300'
          : 'text-stone-600 dark:text-stone-300'
      }`}>
        {title}
      </p>
      {description && (
        <p className={`text-xs mt-1 ${
          variant === 'success'
            ? 'text-emerald-600/70 dark:text-emerald-400/70'
            : 'text-stone-400 dark:text-stone-500'
        }`}>
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
