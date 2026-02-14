import { useEffect } from 'react'
import { WEBSITE_URL, PRICING } from '@shared/constants'

interface UpgradePromptProps {
  isOpen: boolean
  feature: string  // e.g. "CSV & Excel export", "unlimited projects"
  onClose: () => void
}

export default function UpgradePrompt({ isOpen, feature, onClose }: UpgradePromptProps) {
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const handleUpgrade = () => {
    chrome.tabs.create({ url: `${WEBSITE_URL}/billing` })
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-dark-card rounded-2xl shadow-xl w-full max-w-sm p-5"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-labelledby="upgrade-title"
        aria-describedby="upgrade-message"
      >
        {/* Icon */}
        <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center mb-3">
          <svg className="w-5 h-5 text-indigo-500 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>

        <h2
          id="upgrade-title"
          className="text-base font-semibold text-stone-900 dark:text-stone-100 mb-1.5"
        >
          Premium feature
        </h2>
        <p
          id="upgrade-message"
          className="text-sm text-stone-600 dark:text-stone-400 mb-4"
        >
          <span className="font-medium text-stone-700 dark:text-stone-300">{feature}</span> is available on Work Timer Premium.
          Upgrade for ${PRICING.monthly}/mo, ${PRICING.yearly}/yr, or ${PRICING.lifetime} lifetime.
        </p>

        <div className="flex gap-2.5">
          <button
            onClick={onClose}
            className="flex-1 border border-stone-200 dark:border-dark-border py-2.5 rounded-xl text-sm font-medium text-stone-600 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-dark-hover transition-colors"
          >
            Not now
          </button>
          <button
            onClick={handleUpgrade}
            className="flex-1 bg-indigo-500 hover:bg-indigo-600 text-white py-2.5 rounded-xl text-sm font-medium transition-colors shadow-sm"
          >
            Upgrade
          </button>
        </div>
      </div>
    </div>
  )
}
