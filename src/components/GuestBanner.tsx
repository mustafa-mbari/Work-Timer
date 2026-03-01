interface GuestBannerProps {
  daysRemaining: number
  onSignUp: () => void
}

export default function GuestBanner({ daysRemaining, onSignUp }: GuestBannerProps) {
  const isUrgent = daysRemaining <= 2

  return (
    <div
      className={`flex items-center justify-between px-4 py-2 text-xs font-medium shrink-0 ${
        isUrgent
          ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300 border-b border-amber-200 dark:border-amber-800/40'
          : 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 border-b border-indigo-200 dark:border-indigo-800/40'
      }`}
      role="status"
      aria-live="polite"
    >
      <span>
        {daysRemaining > 0
          ? `${daysRemaining} day${daysRemaining !== 1 ? 's' : ''} left`
          : 'Guest expired'}
        {' \u2014 '}
        <button
          onClick={onSignUp}
          className={`underline font-semibold ${
            isUrgent
              ? 'text-amber-900 dark:text-amber-200 hover:text-amber-700'
              : 'text-indigo-800 dark:text-indigo-200 hover:text-indigo-600'
          }`}
        >
          Sign up free to keep your data
        </button>
      </span>
    </div>
  )
}
