import Stripe from 'stripe'

let _stripe: Stripe | null = null

export function getStripe() {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY
    if (!key && process.env.NODE_ENV === 'production') {
      throw new Error('STRIPE_SECRET_KEY is not set')
    }
    _stripe = new Stripe(key || 'dummy_key', {
      apiVersion: '2026-02-25.clover',
    })
  }
  return _stripe
}

function getEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    // During build time on Vercel, some env vars might be missing.
    // We only want to throw if we're actually running in production and need the value.
    if (process.env.NODE_ENV === 'production' && !process.env.NEXT_PHASE) {
       console.warn(`Missing environment variable: ${name}`)
    }
    return ''
  }
  return value
}

export const STRIPE_PRICES: Record<string, string> = {
  monthly: getEnv('STRIPE_PRICE_MONTHLY'),
  yearly: getEnv('STRIPE_PRICE_YEARLY'),
  ...(process.env.STRIPE_PRICE_TEAM_10_MONTHLY && { team_10_monthly: process.env.STRIPE_PRICE_TEAM_10_MONTHLY }),
  ...(process.env.STRIPE_PRICE_TEAM_10_YEARLY  && { team_10_yearly:  process.env.STRIPE_PRICE_TEAM_10_YEARLY  }),
  ...(process.env.STRIPE_PRICE_TEAM_20_MONTHLY && { team_20_monthly: process.env.STRIPE_PRICE_TEAM_20_MONTHLY }),
  ...(process.env.STRIPE_PRICE_TEAM_20_YEARLY  && { team_20_yearly:  process.env.STRIPE_PRICE_TEAM_20_YEARLY  }),
  ...(process.env.STRIPE_PRICE_ALLIN_MONTHLY && { allin_monthly: process.env.STRIPE_PRICE_ALLIN_MONTHLY }),
  ...(process.env.STRIPE_PRICE_ALLIN_YEARLY  && { allin_yearly:  process.env.STRIPE_PRICE_ALLIN_YEARLY  }),
  ...(process.env.STRIPE_PRICE_LIFETIME && { lifetime: process.env.STRIPE_PRICE_LIFETIME }),
}
