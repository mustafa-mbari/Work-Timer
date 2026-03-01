import { useEffect } from 'react'

interface GuestExpiryAlertProps {
  daysRemaining: number
  onSignUp: () => void
  onDismiss: () => void
}

export default function GuestExpiryAlert({ daysRemaining, onSignUp, onDismiss }: GuestExpiryAlertProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onDismiss()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onDismiss])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={onDismiss}
    >
      <div
        className="bg-white dark:bg-dark-card rounded-2xl shadow-xl w-full max-w-sm p-5"
        onClick={e => e.stopPropagation()}
        role="alertdialog"
        aria-labelledby="guest-expiry-title"
        aria-describedby="guest-expiry-message"
      >
        {/* Warning Icon */}
        <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center mb-3">
          <svg className="w-5 h-5 text-amber-500 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
          </svg>
        </div>

        <h2 id="guest-expiry-title" className="text-base font-semibold text-stone-900 dark:text-stone-100 mb-1.5">
          Your guest trial is ending
        </h2>
        <p id="guest-expiry-message" className="text-sm text-stone-600 dark:text-stone-400 mb-4">
          You have <span className="font-semibold text-amber-600 dark:text-amber-400">{daysRemaining} day{daysRemaining !== 1 ? 's' : ''}</span> left.
          All your data (entries, projects, tags) will be permanently deleted when the trial expires.
          Create a free account to keep everything.
        </p>

        {/* What free gives you */}
        <div className="bg-stone-50 dark:bg-dark-elevated rounded-xl p-3 mb-4 text-xs text-stone-600 dark:text-stone-400">
          <p className="font-medium text-stone-700 dark:text-stone-300 mb-1.5">Free account includes:</p>
          <ul className="space-y-1 list-none">
            <li>5 projects & 5 tags (vs. 3 as guest)</li>
            <li>30-day history (vs. 5 days)</li>
            <li>Cross-device access via website</li>
            <li>Data never expires</li>
          </ul>
        </div>

        <div className="flex gap-2.5">
          <button
            onClick={onDismiss}
            className="flex-1 border border-stone-200 dark:border-dark-border py-2.5 rounded-xl text-sm font-medium text-stone-600 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-dark-hover transition-colors"
          >
            Not now
          </button>
          <button
            onClick={onSignUp}
            className="flex-1 bg-indigo-500 hover:bg-indigo-600 text-white py-2.5 rounded-xl text-sm font-medium transition-colors shadow-sm"
          >
            Sign up free
          </button>
        </div>
      </div>
    </div>
  )
}
