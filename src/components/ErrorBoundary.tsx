import { Component } from 'react'
import type { ReactNode, ErrorInfo } from 'react'
import { logger } from '@/utils/logger'
import { getUserFriendlyError } from '@/utils/errorMessages'

interface Props {
  children: ReactNode
  /** Compact mode for per-view boundaries (no fixed height, smaller UI) */
  compact?: boolean
}

interface State {
  hasError: boolean
  error: Error | null
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    logger.error('Uncaught error in component tree', error, {
      component: 'ErrorBoundary',
      componentStack: info.componentStack
    })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.compact) {
        return (
          <div className="flex flex-col items-center justify-center gap-2 p-6 text-center">
            <div className="w-9 h-9 rounded-full bg-rose-50 dark:bg-rose-500/10 flex items-center justify-center">
              <span className="text-base text-rose-500" aria-hidden="true">!</span>
            </div>
            <p className="text-xs font-medium text-stone-700 dark:text-stone-300">Something went wrong</p>
            <p className="text-[11px] text-stone-500 dark:text-stone-400 max-w-[240px]">
              {getUserFriendlyError(this.state.error)}
            </p>
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="mt-1 text-xs font-medium text-indigo-500 dark:text-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-300 transition-colors"
            >
              Try again
            </button>
          </div>
        )
      }

      return (
        <div className="flex flex-col items-center justify-center h-[520px] p-8 text-center bg-stone-50 dark:bg-dark">
          <div className="w-12 h-12 rounded-full bg-rose-50 dark:bg-rose-500/10 flex items-center justify-center mb-4">
            <span className="text-xl text-rose-500" aria-hidden="true">!</span>
          </div>
          <h1 className="text-sm font-semibold text-stone-800 dark:text-stone-200 mb-2">Something went wrong</h1>
          <p className="text-xs text-stone-500 dark:text-stone-400 mb-5 max-w-[260px]">
            {getUserFriendlyError(this.state.error)}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="bg-indigo-500 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-indigo-600 transition-colors shadow-sm shadow-indigo-500/20"
          >
            Try Again
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
