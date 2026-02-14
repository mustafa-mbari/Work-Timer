/**
 * User-friendly error messages for common error scenarios
 */

export const ERROR_MESSAGES = {
  // Network errors
  NETWORK_ERROR: 'Unable to connect. Please check your internet connection.',
  TIMEOUT: 'Request timed out. Please try again.',

  // Storage errors
  STORAGE_FULL: 'Storage is full. Please free up some space.',
  STORAGE_ERROR: 'Failed to save data. Please try again.',

  // Permission errors
  PERMISSION_DENIED: 'Permission denied. Please check your browser settings.',

  // Data errors
  INVALID_DATA: 'The data format is invalid. Please check your input.',
  NOT_FOUND: 'The requested item was not found.',

  // Generic errors
  UNKNOWN_ERROR: 'Something went wrong. Please try again.',
  TRY_AGAIN: 'An error occurred. Please try again later.',
}

/**
 * Convert technical error to user-friendly message
 */
export function getUserFriendlyError(error: unknown): string {
  if (!error) return ERROR_MESSAGES.UNKNOWN_ERROR

  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase()

  // Network errors
  if (message.includes('network') || message.includes('fetch') || message.includes('connection')) {
    return ERROR_MESSAGES.NETWORK_ERROR
  }

  // Timeout errors
  if (message.includes('timeout') || message.includes('timed out')) {
    return ERROR_MESSAGES.TIMEOUT
  }

  // Storage errors
  if (message.includes('quota') || message.includes('storage full')) {
    return ERROR_MESSAGES.STORAGE_FULL
  }
  if (message.includes('storage') || message.includes('localstorage')) {
    return ERROR_MESSAGES.STORAGE_ERROR
  }

  // Permission errors
  if (message.includes('permission') || message.includes('denied')) {
    return ERROR_MESSAGES.PERMISSION_DENIED
  }

  // Data errors
  if (message.includes('invalid') || message.includes('malformed')) {
    return ERROR_MESSAGES.INVALID_DATA
  }
  if (message.includes('not found') || message.includes('404')) {
    return ERROR_MESSAGES.NOT_FOUND
  }

  // If error message is already user-friendly (no technical jargon), return it
  if (error instanceof Error && !hasTechnicalJargon(message)) {
    return error.message
  }

  return ERROR_MESSAGES.TRY_AGAIN
}

/**
 * Check if message contains technical jargon
 */
function hasTechnicalJargon(message: string): boolean {
  const technicalTerms = [
    'undefined', 'null', 'exception', 'stack', 'trace',
    'cannot read', 'property of', 'is not a function',
    'reference error', 'type error', 'syntax error'
  ]
  return technicalTerms.some(term => message.includes(term))
}
