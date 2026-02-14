interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export default function Spinner({ size = 'md', className = '' }: SpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4 border-2',
    md: 'w-6 h-6 border-2',
    lg: 'w-8 h-8 border-3'
  }

  return (
    <div
      className={`${sizeClasses[size]} border-stone-300 dark:border-stone-600 border-t-indigo-500 dark:border-t-indigo-400 rounded-full animate-spin ${className}`}
      role="status"
      aria-label="Loading"
    >
      <span className="sr-only">Loading...</span>
    </div>
  )
}

/**
 * Full-page loading overlay
 */
export function LoadingOverlay({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white/80 dark:bg-dark/80 backdrop-blur-sm">
      <Spinner size="lg" />
      <p className="mt-4 text-sm text-stone-600 dark:text-stone-400">{message}</p>
    </div>
  )
}

/**
 * Inline loading state
 */
export function LoadingState({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-8">
      <Spinner />
      <p className="mt-3 text-xs text-stone-500 dark:text-stone-400">{message}</p>
    </div>
  )
}
