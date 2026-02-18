import Stripe from 'stripe'

let _stripe: Stripe | null = null

export function getStripe() {
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2026-01-28.clover',
    })
  }
  return _stripe
}

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`Missing required environment variable: ${name}`)
  return value
}

export const STRIPE_PRICES = {
  monthly: requireEnv('STRIPE_PRICE_MONTHLY'),
  yearly: requireEnv('STRIPE_PRICE_YEARLY'),
  lifetime: requireEnv('STRIPE_PRICE_LIFETIME'),
} as const

export type PricePlan = keyof typeof STRIPE_PRICES
