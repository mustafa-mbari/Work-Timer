import { Zap, CreditCard, History, Calendar, CheckCircle2, Download, AlertCircle, BarChart3 } from 'lucide-react'
import { getTranslations } from 'next-intl/server'
import { headers } from 'next/headers'
import type { Metadata } from 'next'
import BillingCards from './BillingCards'
import PortalButton from './PortalButton'
import PromoCodeInput from './PromoCodeInput'
import { requireAuth } from '@/lib/services/auth'
import { getUserSubscriptionForBilling } from '@/lib/repositories/subscriptions'
import { getStripe } from '@/lib/stripe'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'

const EU_COUNTRIES = new Set([
  'AT','BE','BG','HR','CY','CZ','DK','EE','FI','FR','DE','GR','HU','IE',
  'IT','LV','LT','LU','MT','NL','PL','PT','RO','SK','SI','ES','SE',
  'NO','CH','IS','LI',
])

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('billing')
  return { title: t('title') }
}

export default async function BillingPage() {
  const user = await requireAuth()
  const [t, { data: subscription }, headersList] = await Promise.all([
    getTranslations('billing'),
    getUserSubscriptionForBilling(user.id),
    headers(),
  ])

  const country = headersList.get('x-vercel-ip-country') ?? ''
  const currencySymbol = EU_COUNTRIES.has(country) ? '€' : '$'

  const currentPlan = subscription?.plan ?? 'free'
  const isPremium = currentPlan !== 'free'
  const isAllIn = currentPlan.startsWith('allin') || currentPlan.startsWith('team_')

  // Fetch Stripe data if applicable
  let invoices: any[] = []
  let defaultPaymentMethod: any = null

  if (subscription?.stripe_customer_id) {
    const stripe = getStripe()
    try {
      const [invoicesResponse, customer] = await Promise.all([
        stripe.invoices.list({ customer: subscription.stripe_customer_id, limit: 10 }),
        stripe.customers.retrieve(subscription.stripe_customer_id, {
          expand: ['default_source', 'invoice_settings.default_payment_method'],
        }),
      ])
      invoices = invoicesResponse.data
      
      const cust = customer as any
      defaultPaymentMethod = cust.invoice_settings?.default_payment_method || cust.default_source
    } catch (err) {
      console.error('Error fetching Stripe data:', err)
    }
  }

  const FREE_FEATURES = [
    { text: t('freePlanFeatures.0'), included: true },
    { text: t('freePlanFeatures.1'), included: true },
    { text: t('freePlanFeatures.2'), included: true },
    { text: t('features.3'), included: false },
    { text: t('features.4'), included: false },
    { text: t('features.5'), included: false },
  ]

  const PREMIUM_FEATURES = [
    t('features.0'),
    t('features.1'),
    t('features.2'),
    t('features.3'),
    t('features.4'),
    t('features.5'),
  ]

  const renewalInfo = (() => {
    if (!isPremium) return null
    if (!subscription?.current_period_end) return null
    const date = new Date(subscription.current_period_end).toLocaleDateString()
    return subscription.cancel_at_period_end ? `${t('plan.cancels')} ${date}` : `${t('plan.renews')} ${date}`
  })()

  const planDisplayName: Record<string, string> = {
    free: t('freePlan.name'),
    premium_monthly: `${t('plans.monthly.name')} Pro`,
    premium_yearly: `${t('plans.yearly.name')} Pro`,
    allin_monthly: 'Team Monthly (Legacy)',
    allin_yearly: 'Team Yearly (Legacy)',
    team_10_monthly: 'Team (10) Monthly',
    team_10_yearly: 'Team (10) Yearly',
    team_20_monthly: 'Team (20) Monthly',
    team_20_yearly: 'Team (20) Yearly',
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in pb-12">
      <div className="flex flex-col md:flex-row gap-6">
        {/* Left Column: Current Plan & Status */}
        <div className="flex-1 space-y-6">
          <div className="bg-white dark:bg-[var(--dark-card)] rounded-2xl border border-stone-200 dark:border-[var(--dark-border)] overflow-hidden shadow-sm">
            <div className="bg-indigo-600 p-6 text-white">
              <div className="flex justify-between items-start mb-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-indigo-200" />
                    <span className="text-xs font-bold uppercase tracking-widest text-indigo-100">{t('currentPlan')}</span>
                  </div>
                  <h2 className="text-2xl font-bold">{planDisplayName[currentPlan] ?? currentPlan}</h2>
                </div>
                <Badge variant="outline" className="bg-white/10 text-white border-white/20 px-3 py-1">
                  {subscription?.status === 'active' || currentPlan === 'free' ? 'Active' : subscription?.status}
                </Badge>
              </div>
              
              <div className="flex items-center gap-2 text-indigo-100 text-sm">
                <Calendar className="h-4 w-4" />
                <span>{renewalInfo || t('freePlan.noCreditCard')}</span>
              </div>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 rounded-xl bg-stone-50 dark:bg-[var(--dark-elevated)] border border-stone-100 dark:border-[var(--dark-border)]">
                  <div className="text-xs text-stone-500 dark:text-stone-400 mb-1">Status</div>
                  <div className="flex items-center gap-1.5 font-semibold text-stone-800 dark:text-stone-100">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    Good Standing
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-stone-50 dark:bg-[var(--dark-elevated)] border border-stone-100 dark:border-[var(--dark-border)]">
                  <div className="text-xs text-stone-500 dark:text-stone-400 mb-1">{t('nextBilling')}</div>
                  <div className="font-semibold text-stone-800 dark:text-stone-100">
                    {subscription?.current_period_end ? new Date(subscription.current_period_end).toLocaleDateString() : 'N/A'}
                  </div>
                </div>
              </div>
              
              {!subscription?.cancel_at_period_end && isPremium && (
                <div className="pt-2">
                  <PortalButton />
                </div>
              )}
            </div>
          </div>

          {/* Payment Method Card */}
          <div className="bg-white dark:bg-[var(--dark-card)] rounded-2xl border border-stone-200 dark:border-[var(--dark-border)] p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-10 w-10 rounded-xl bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center">
                <CreditCard className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <h3 className="font-bold text-stone-800 dark:text-stone-100">{t('paymentMethod')}</h3>
                <p className="text-xs text-stone-500 dark:text-stone-400">Default billing method</p>
              </div>
            </div>

            {defaultPaymentMethod ? (
              <div className="flex items-center justify-between p-4 rounded-xl border border-stone-100 dark:border-[var(--dark-border)] bg-stone-50/50 dark:bg-[var(--dark-elevated)]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-6 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded flex items-center justify-center text-[10px] font-bold uppercase text-stone-400">
                    {defaultPaymentMethod.card?.brand || 'Card'}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-stone-800 dark:text-stone-100">
                      •••• •••• •••• {defaultPaymentMethod.card?.last4 || '****'}
                    </div>
                    <div className="text-xs text-stone-500 dark:text-stone-400">
                      Expires {defaultPaymentMethod.card?.exp_month}/{defaultPaymentMethod.card?.exp_year}
                    </div>
                  </div>
                </div>
                <PortalButton />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-4 border-2 border-dashed border-stone-100 dark:border-[var(--dark-border)] rounded-xl">
                <AlertCircle className="h-5 w-5 text-stone-300 mb-2" />
                <p className="text-sm text-stone-400">{isPremium ? 'Payment method managed by Stripe' : 'No payment method set'}</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Billing History */}
        <div className="md:w-1/3 space-y-6">
          <div className="bg-white dark:bg-[var(--dark-card)] rounded-2xl border border-stone-200 dark:border-[var(--dark-border)] overflow-hidden shadow-sm h-full flex flex-col">
            <div className="p-6 border-b border-stone-100 dark:border-[var(--dark-border)]">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-stone-50 dark:bg-[var(--dark-elevated)] flex items-center justify-center">
                  <History className="h-5 w-5 text-stone-600 dark:text-stone-400" />
                </div>
                <h3 className="font-bold text-stone-800 dark:text-stone-100">{t('history')}</h3>
              </div>
            </div>
            
            <div className="flex-1 overflow-auto max-h-[400px]">
              {invoices.length > 0 ? (
                <Table>
                  <TableHeader className="bg-stone-50/50 dark:bg-[var(--dark-hover)]">
                    <TableRow>
                      <TableHead className="text-xs">{t('date')}</TableHead>
                      <TableHead className="text-xs">{t('amount')}</TableHead>
                      <TableHead className="text-right text-xs"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoices.map((invoice) => (
                      <TableRow key={invoice.id} className="text-sm">
                        <TableCell className="text-stone-600 dark:text-stone-400">
                          {new Date(invoice.created * 1000).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="font-medium">
                          {(invoice.amount_paid / 100).toLocaleString(undefined, {
                            style: 'currency',
                            currency: invoice.currency.toUpperCase(),
                          })}
                        </TableCell>
                        <TableCell className="text-right">
                          <a 
                            href={invoice.invoice_pdf} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-indigo-500 hover:text-indigo-600 transition-colors"
                            title="Download PDF"
                          >
                            <Download className="h-4 w-4 ml-auto" />
                          </a>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="p-8 text-center space-y-2">
                  <p className="text-sm text-stone-500 dark:text-stone-400">{t('noInvoices')}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Usage / Promo Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-[var(--dark-card)] rounded-2xl border border-stone-200 dark:border-[var(--dark-border)] p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-10 w-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center">
              <BarChart3 className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <h3 className="font-bold text-stone-800 dark:text-stone-100">{t('usage')}</h3>
          </div>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-medium">
                <span className="text-stone-500">Projects</span>
                <span className="text-stone-800 dark:text-stone-200">{currentPlan === 'free' ? 'Up to 5' : 'Unlimited'}</span>
              </div>
              <div className="h-2 rounded-full bg-stone-100 dark:bg-[var(--dark-elevated)] overflow-hidden">
                <div className="h-full bg-indigo-500 w-[60%] rounded-full" />
              </div>
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-medium">
                <span className="text-stone-500">Devices</span>
                <span className="text-stone-800 dark:text-stone-200">{currentPlan === 'free' ? '1 Device' : 'Unlimited'}</span>
              </div>
              <div className="h-2 rounded-full bg-stone-100 dark:bg-[var(--dark-elevated)] overflow-hidden">
                <div className="h-full bg-amber-500 w-[100%] rounded-full" />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-[var(--dark-card)] rounded-2xl border border-stone-200 dark:border-[var(--dark-border)] p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center">
              <Zap className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h3 className="font-bold text-stone-800 dark:text-stone-100">{t('promoCode')}</h3>
          </div>
          <p className="text-xs text-stone-500 dark:text-stone-400 mb-4">{t('promoDesc')}</p>
          <PromoCodeInput />
        </div>
      </div>

      {/* Upgrade / Plan Change Section */}
      <div className="pt-8 space-y-6">
        <div className="text-center space-y-1">
          <h2 className="text-2xl font-bold text-stone-900 dark:text-stone-100">{t('choosePlan')}</h2>
          <p className="text-stone-500 dark:text-stone-400">{t('description')}</p>
        </div>
        
        <BillingCards
          currentPlan={currentPlan}
          isPremium={isPremium}
          isAllIn={isAllIn}
          currency={currencySymbol}
          translations={{
            currentPlan: t('currentPlan'),
            notAvailable: t('notAvailable'),
            freePlan: {
              name: t('freePlan.name'),
              price: t('freePlan.price'),
              period: t('freePlan.period'),
              noCreditCard: t('freePlan.noCreditCard'),
              currentPlan: t('freePlan.currentPlan'),
              freeTier: t('freePlan.freeTier'),
            },
            freePlanFeatures: FREE_FEATURES,
            premiumFeatures: PREMIUM_FEATURES,
            upgradeToYearly: t('upgradeToYearly'),
          }}
        />
      </div>
    </div>
  )
}
