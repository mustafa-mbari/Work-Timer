import Stripe from 'stripe'

let _stripe: Stripe | null = null

export function getStripe() {
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2026-02-25.clover',
    })
  }
  return _stripe
}

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`Missing required environment variable: ${name}`)
  return value
}

export const STRIPE_PRICES: Record<string, string> = {
  monthly: requireEnv('STRIPE_PRICE_MONTHLY'),
  yearly: requireEnv('STRIPE_PRICE_YEARLY'),
  // Team plans
  ...(process.env.STRIPE_PRICE_TEAM_10_MONTHLY && { team_10_monthly: process.env.STRIPE_PRICE_TEAM_10_MONTHLY }),
  ...(process.env.STRIPE_PRICE_TEAM_10_YEARLY  && { team_10_yearly:  process.env.STRIPE_PRICE_TEAM_10_YEARLY  }),
  ...(process.env.STRIPE_PRICE_TEAM_20_MONTHLY && { team_20_monthly: process.env.STRIPE_PRICE_TEAM_20_MONTHLY }),
  ...(process.env.STRIPE_PRICE_TEAM_20_YEARLY  && { team_20_yearly:  process.env.STRIPE_PRICE_TEAM_20_YEARLY  }),
  // Legacy allin — kept for existing subscribers
  ...(process.env.STRIPE_PRICE_ALLIN_MONTHLY && { allin_monthly: process.env.STRIPE_PRICE_ALLIN_MONTHLY }),
  ...(process.env.STRIPE_PRICE_ALLIN_YEARLY  && { allin_yearly:  process.env.STRIPE_PRICE_ALLIN_YEARLY  }),
  // Keep lifetime price for backwards compat (existing subscribers)
  ...(process.env.STRIPE_PRICE_LIFETIME && { lifetime: process.env.STRIPE_PRICE_LIFETIME }),
}

export type PricePlan =
  | 'monthly' | 'yearly'
  | 'team_10_monthly' | 'team_10_yearly'
  | 'team_20_monthly' | 'team_20_yearly'
  | 'allin_monthly'   | 'allin_yearly'
