interface GuestBannerProps {
  daysRemaining: number
  onSignUp: () => void
  onDismiss: () => void
}

export default function GuestBanner({ daysRemaining, onSignUp, onDismiss }: GuestBannerProps) {
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
      <span className="flex items-center gap-1.5">
        {isUrgent ? (
          /* Warning icon for urgent state */
          <svg className="w-3.5 h-3.5 flex-shrink-0 text-amber-500 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
          </svg>
        ) : (
          /* Cloud-upload icon for normal state */
          <svg className="w-3.5 h-3.5 flex-shrink-0 text-indigo-400 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.338-2.338 4.502 4.502 0 013.516 5.855A3.75 3.75 0 0118 19.5H6.75z" />
          </svg>
        )}
        <span>
          {isUrgent
            ? `${daysRemaining} day${daysRemaining !== 1 ? 's' : ''} left \u2014 `
            : 'Sync your progress & unlock more \u2014 '}
          <button
            onClick={onSignUp}
            className={`underline font-semibold ${
              isUrgent
                ? 'text-amber-900 dark:text-amber-200 hover:text-amber-700'
                : 'text-indigo-800 dark:text-indigo-200 hover:text-indigo-600'
            }`}
          >
            Sign up free
          </button>
        </span>
      </span>

      {/* Dismiss button */}
      <button
        onClick={onDismiss}
        className={`p-0.5 rounded opacity-50 hover:opacity-100 transition-opacity ${
          isUrgent
            ? 'text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-800/30'
            : 'text-indigo-500 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-800/30'
        }`}
        aria-label="Dismiss banner"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}
