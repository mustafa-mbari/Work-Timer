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
  allinMonthly: 'allin_monthly',
  allinYearly: 'allin_yearly',
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
  allinMonthly: 29.99,
  allinYearly: 299,
} as const

export const ALLIN_LIMITS = {
  ...PREMIUM_LIMITS,
  allowGroups: true,
  allowEarnings: true,
  defaultMaxGroupMembers: 10,
} as const

export const WEBSITE_URL = 'https://w-timer.com'
