// Shared constants used by both the Chrome Extension and the companion website.

export const FREE_LIMITS = {
  maxProjects: 5,
  maxTags: 5,
  historyDays: 14,
  allowExport: false,
  allowCloudSync: false,
  allowAdvancedStats: false,
  allowWorkTypeEdit: false,
} as const

export const PREMIUM_LIMITS = {
  maxProjects: Infinity,
  maxTags: Infinity,
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
  allinMonthly: 'allin_monthly',       // legacy — kept for existing subscribers
  allinYearly: 'allin_yearly',         // legacy — kept for existing subscribers
  team10Monthly: 'team_10_monthly',
  team10Yearly: 'team_10_yearly',
  team20Monthly: 'team_20_monthly',
  team20Yearly: 'team_20_yearly',
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
  yearly: 17.99,         // was 9.99
  allinMonthly: 29.99,   // legacy display
  allinYearly: 299,      // legacy display
  team10Monthly: 29,
  team10Yearly: 260,
  team20Monthly: 49,
  team20Yearly: 440,
} as const

export const ALLIN_LIMITS = {
  ...PREMIUM_LIMITS,
  allowGroups: true,
  allowEarnings: true,
  defaultMaxGroupMembers: 10,
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

export const WEBSITE_URL = 'https://w-timer.com'

// TODO: Replace with your published extension URL once live
// e.g. 'https://chrome.google.com/webstore/detail/work-timer/YOUR_EXTENSION_ID'
export const CHROME_STORE_URL = 'https://chrome.google.com/webstore'
