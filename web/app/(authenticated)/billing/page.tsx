import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import CheckoutButton from './CheckoutButton'
import PortalButton from './PortalButton'
import PromoCodeInput from './PromoCodeInput'
import { PRICING } from '@shared/constants'
import { requireAuth } from '@/lib/services/auth'
import { getUserSubscriptionForBilling } from '@/lib/repositories/subscriptions'

export default async function BillingPage() {
  const user = await requireAuth()

  const { data: subscription } = await getUserSubscriptionForBilling(user.id)

  const isPremium = subscription && subscription.plan !== 'free'
  const isLifetime = subscription?.plan === 'premium_lifetime'

  const planLabel: Record<string, string> = {
    free: 'Free',
    premium_monthly: 'Premium Monthly',
    premium_yearly: 'Premium Yearly',
    premium_lifetime: 'Premium Lifetime',
  }

  const sourceLabel: Record<string, string> = {
    stripe: 'Stripe Payment',
    domain: 'Domain Whitelist',
    promo: 'Promo Code',
    admin_manual: 'Manual Grant',
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-100">Billing</h1>
        <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">Manage your subscription and payment methods</p>
      </div>

      {/* Current plan */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Current Plan</CardTitle>
            <Badge variant={isPremium ? 'success' : 'secondary'}>
              {isPremium ? 'Active' : 'Free'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-lg font-semibold text-stone-900 dark:text-stone-100 mb-1">
            {planLabel[subscription?.plan ?? 'free'] || 'Free'}
          </p>
          <div className="text-sm text-stone-600 dark:text-stone-400">
            {subscription?.plan === 'free' && (
              <p>Up to 5 projects &middot; 30-day history &middot; Local storage only</p>
            )}
            {subscription?.plan === 'premium_monthly' && (
              <p>
                ${PRICING.monthly}/month &middot;{' '}
                {subscription.current_period_end
                  ? subscription.cancel_at_period_end
                    ? `Cancels on ${new Date(subscription.current_period_end).toLocaleDateString()}`
                    : `Renews on ${new Date(subscription.current_period_end).toLocaleDateString()}`
                  : 'No expiry set'}
              </p>
            )}
            {subscription?.plan === 'premium_yearly' && (
              <p>
                ${PRICING.yearly}/year &middot;{' '}
                {subscription.current_period_end
                  ? subscription.cancel_at_period_end
                    ? `Cancels on ${new Date(subscription.current_period_end).toLocaleDateString()}`
                    : `Renews on ${new Date(subscription.current_period_end).toLocaleDateString()}`
                  : 'No expiry set'}
              </p>
            )}
            {subscription?.plan === 'premium_lifetime' && (
              <p>One-time payment &middot; No renewals &middot; You own this forever</p>
            )}
            {isPremium && subscription?.granted_by && (
              <p className="text-xs text-stone-400 dark:text-stone-500 mt-1">
                Source: {sourceLabel[subscription.granted_by] || subscription.granted_by}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Upgrade options (if free) */}
      {!isPremium && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Upgrade to Premium</CardTitle>
              <CardDescription>Unlock cloud sync, unlimited projects, and data export</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <CheckoutButton plan="monthly" label={`Monthly — $${PRICING.monthly}/mo`} />
              <CheckoutButton plan="yearly" label={`Yearly — $${PRICING.yearly}/yr (Best value)`} />
              <CheckoutButton plan="lifetime" label={`Lifetime — $${PRICING.lifetime} one-time`} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Have a promo code?</CardTitle>
            </CardHeader>
            <CardContent>
              <PromoCodeInput />
            </CardContent>
          </Card>
        </>
      )}

      {/* Manage subscription */}
      {isPremium && !isLifetime && subscription?.stripe_customer_id && (
        <Card>
          <CardHeader>
            <CardTitle>Manage Subscription</CardTitle>
            <CardDescription>
              Update payment method, view invoices, or cancel your subscription.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PortalButton />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
