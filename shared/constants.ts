// Shared constants used by both the Chrome Extension and the companion website.

export const FREE_LIMITS = {
  maxProjects: 5,
  historyDays: 30,
  allowExport: false,
  allowCloudSync: false,
  allowAdvancedStats: false,
  allowWorkTypeEdit: false,
} as const

export const PREMIUM_LIMITS = {
  maxProjects: Infinity,
  historyDays: Infinity,
  allowExport: true,
  allowCloudSync: true,
  allowAdvancedStats: true,
  allowWorkTypeEdit: true,
} as const

export type Limits = typeof FREE_LIMITS | typeof PREMIUM_LIMITS

export const PLANS = {
  free: 'free',
  premiumMonthly: 'premium_monthly',
  premiumYearly: 'premium_yearly',
  premiumLifetime: 'premium_lifetime',
} as const

export type Plan = (typeof PLANS)[keyof typeof PLANS]

export const SUBSCRIPTION_STATUSES = {
  active: 'active',
  trialing: 'trialing',
  past_due: 'past_due',
  canceled: 'canceled',
  unpaid: 'unpaid',
  incomplete: 'incomplete',
} as const

export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[keyof typeof SUBSCRIPTION_STATUSES]

export const PRICING = {
  monthly: 1.99,
  yearly: 9.99,
  lifetime: 29.99,
} as const

export const ENTRY_SAVE_TIME = {
  min: 5,
  max: 240,
  default: 10,
  options: [
    { value: 5, label: '5 seconds' },
    { value: 10, label: '10 seconds' },
    { value: 15, label: '15 seconds' },
    { value: 30, label: '30 seconds' },
    { value: 60, label: '1 minute' },
    { value: 120, label: '2 minutes' },
    { value: 180, label: '3 minutes' },
    { value: 240, label: '4 minutes' },
  ],
} as const

export const WEBSITE_URL =
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Vite env access
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_WEBSITE_URL) ||
  'https://w-timer.com'
