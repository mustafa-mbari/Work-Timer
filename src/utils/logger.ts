/**
 * Structured logging utility for better error tracking and debugging
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogContext {
  component?: string
  action?: string
  [key: string]: unknown
}

class Logger {
  private isDevelopment = import.meta.env.DEV

  private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString()
    const component = context?.component || 'unknown'
    const action = context?.action || ''
    const actionStr = action ? ` [${action}]` : ''
    return `[${timestamp}] [${level.toUpperCase()}] [${component}]${actionStr} ${message}`
  }

  debug(message: string, context?: LogContext): void {
    if (this.isDevelopment) {
      console.debug(this.formatMessage('debug', message, context), context)
    }
  }

  info(message: string, context?: LogContext): void {
    console.info(this.formatMessage('info', message, context), context)
  }

  warn(message: string, context?: LogContext): void {
    console.warn(this.formatMessage('warn', message, context), context)
  }

  error(message: string, error?: Error | unknown, context?: LogContext): void {
    const errorDetails = error instanceof Error
      ? { message: error.message, stack: error.stack, name: error.name }
      : { error }

    console.error(
      this.formatMessage('error', message, context),
      { ...context, error: errorDetails }
    )
  }

  /**
   * Log timer state changes for debugging
   */
  timerStateChange(from: string, to: string, context?: Record<string, unknown>): void {
    this.info(`Timer state changed: ${from} → ${to}`, {
      component: 'timer',
      action: 'state-change',
      from,
      to,
      ...context
    })
  }

  /**
   * Log storage operations
   */
  storage(operation: string, key: string, success: boolean, error?: Error): void {
    if (success) {
      this.debug(`Storage ${operation}: ${key}`, { component: 'storage', action: operation, key })
    } else {
      this.error(`Storage ${operation} failed: ${key}`, error, { component: 'storage', action: operation, key })
    }
  }
}

export const logger = new Logger()
