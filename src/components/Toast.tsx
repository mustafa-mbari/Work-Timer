import { useState, useEffect, useCallback, createContext, useContext } from 'react'
import type { ReactNode } from 'react'

type ToastType = 'success' | 'error' | 'info'

interface Toast {
  id: number
  message: string
  type: ToastType
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void
}

const ToastContext = createContext<ToastContextValue>({ showToast: () => {} })

// eslint-disable-next-line react-refresh/only-export-components
export function useToast() {
  return useContext(ToastContext)
}

let nextId = 0

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = nextId++
    setToasts(prev => [...prev, { id, message, type }])
  }, [])

  const removeToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-14 left-3 right-3 flex flex-col gap-2 z-50 pointer-events-none">
        {toasts.map(toast => (
          <ToastItem key={toast.id} toast={toast} onDismiss={removeToast} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: number) => void }) {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(toast.id), 3000)
    return () => clearTimeout(timer)
  }, [toast.id, onDismiss])

  const bgColor = {
    success: 'bg-emerald-600',
    error: 'bg-rose-600',
    info: 'bg-stone-800 dark:bg-stone-200 dark:text-stone-900',
  }[toast.type]

  return (
    <div
      className={`${bgColor} text-white text-xs font-medium px-4 py-2.5 rounded-xl shadow-lg pointer-events-auto animate-fade-in`}
      role="alert"
      aria-live="polite"
    >
      {toast.message}
    </div>
  )
}
