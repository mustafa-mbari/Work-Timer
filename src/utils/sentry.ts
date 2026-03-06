import * as Sentry from '@sentry/browser'

let initialized = false

export function initSentry() {
  if (initialized) return
  initialized = true

  const dsn = import.meta.env.VITE_SENTRY_DSN
  if (!dsn) return

  Sentry.init({
    dsn,
    tracesSampleRate: 0.1,
    environment: 'extension',
    enabled: import.meta.env.PROD,
  })
}

export { Sentry }
