import { useEffect } from 'react'

interface ConfirmDialogProps {
  isOpen: boolean
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  onConfirm: () => void
  onCancel: () => void
  variant?: 'danger' | 'warning' | 'info'
}

export default function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  variant = 'danger'
}: ConfirmDialogProps) {
  // ESC key to cancel
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onCancel])

  if (!isOpen) return null

  const variantStyles = {
    danger: 'bg-rose-500 hover:bg-rose-600',
    warning: 'bg-amber-500 hover:bg-amber-600',
    info: 'bg-indigo-500 hover:bg-indigo-600'
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div
        className="bg-white dark:bg-dark-card rounded-2xl shadow-xl w-full max-w-sm p-5"
        onClick={e => e.stopPropagation()}
        role="alertdialog"
        aria-labelledby="dialog-title"
        aria-describedby="dialog-message"
      >
        <h2
          id="dialog-title"
          className="text-base font-semibold text-stone-900 dark:text-stone-100 mb-2"
        >
          {title}
        </h2>
        <p
          id="dialog-message"
          className="text-sm text-stone-600 dark:text-stone-400 mb-5"
        >
          {message}
        </p>
        <div className="flex gap-2.5">
          <button
            onClick={onCancel}
            className="flex-1 border border-stone-200 dark:border-dark-border py-2.5 rounded-xl text-sm font-medium text-stone-600 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-dark-hover transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 text-white py-2.5 rounded-xl text-sm font-medium transition-colors shadow-sm ${variantStyles[variant]}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}
