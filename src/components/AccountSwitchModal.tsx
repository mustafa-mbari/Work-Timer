import { useEffect } from 'react'

interface AccountSwitchModalProps {
  isOpen: boolean
  onChoice: (choice: 'clear' | 'merge' | 'keep') => void
}

export default function AccountSwitchModal({ isOpen, onChoice }: AccountSwitchModalProps) {
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onChoice('clear')
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onChoice])

  if (!isOpen) return null

  const options = [
    {
      key: 'clear' as const,
      label: 'Start Fresh',
      description: 'Clear local data and download from the new account',
      style: 'bg-indigo-500 hover:bg-indigo-600 text-white shadow-sm shadow-indigo-500/20',
    },
    {
      key: 'merge' as const,
      label: 'Merge Data',
      description: 'Upload existing data to the new account, then sync',
      style: 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm shadow-emerald-500/20',
    },
    {
      key: 'keep' as const,
      label: 'Keep & Overlay',
      description: 'Keep local data as-is and pull cloud data on top',
      style: 'border border-stone-200 dark:border-dark-border text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-dark-hover',
    },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div
        className="bg-white dark:bg-dark-card rounded-2xl shadow-xl w-full max-w-sm p-5"
        role="alertdialog"
        aria-labelledby="switch-title"
        aria-describedby="switch-message"
      >
        <h2
          id="switch-title"
          className="text-base font-semibold text-stone-900 dark:text-stone-100 mb-1.5"
        >
          Different Account Detected
        </h2>
        <p
          id="switch-message"
          className="text-sm text-stone-600 dark:text-stone-400 mb-4"
        >
          You have existing data from another account. What would you like to do?
        </p>
        <div className="flex flex-col gap-2.5">
          {options.map((opt) => (
            <button
              key={opt.key}
              onClick={() => onChoice(opt.key)}
              className={`w-full py-2.5 px-3.5 rounded-xl text-left transition-colors ${opt.style}`}
            >
              <div className="text-sm font-medium">{opt.label}</div>
              <div className="text-xs opacity-75 mt-0.5">{opt.description}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
