import { getTranslations } from 'next-intl/server'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Container, SectionHeader } from '@/components/layout'
import PricingCard from '@/components/PricingCard'
import { ShieldCheck, WifiOff, Zap } from 'lucide-react'

const TRUST_ICONS = [ShieldCheck, WifiOff, Zap]

interface Props {
  isLoggedIn: boolean
}

export async function PricingSection({ isLoggedIn }: Props) {
  const t = await getTranslations('landing.pricing')
  const trustBadges = t.raw('trustBadges') as string[]

  return (
    <section className="py-20" id="pricing" aria-label="Pricing">
      <Container variant="marketing">
        <SectionHeader
          eyebrow={t('badge')}
          title={t('title')}
          subtitle={t('subtitle')}
        />

        {/* Free plan banner */}
        <Card className="mb-6 border-stone-200 dark:border-[var(--dark-border)]">
          <CardContent className="flex items-center justify-between gap-4 pt-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-stone-900 dark:text-stone-100">{t('freePlan.name')}</h3>
                <Badge variant="secondary">{t('freePlan.badge')}</Badge>
              </div>
              <p className="text-sm text-stone-500 dark:text-stone-400">
                {t('freePlan.description')}
              </p>
            </div>
            <div className="text-right shrink-0">
              <span className="text-3xl font-bold text-stone-900 dark:text-stone-100">{t('freePlan.price')}</span>
              <p className="text-xs text-stone-400 dark:text-stone-500 mt-0.5">{t('freePlan.noCreditCard')}</p>
            </div>
          </CardContent>
        </Card>

        {/* Premium plans */}
        <div className="grid grid-cols-2 gap-4">
          <PricingCard plan="monthly" isLoggedIn={isLoggedIn} />
          <PricingCard plan="yearly" isLoggedIn={isLoggedIn} />
        </div>

        {/* Trust badges */}
        <div className="flex gap-6 justify-center mt-8">
          {trustBadges.map((label, idx) => {
            const Icon = TRUST_ICONS[idx]
            return (
              <div key={idx} className="flex items-center gap-2 text-sm text-stone-500 dark:text-stone-400">
                <Icon className="h-4 w-4 text-indigo-500 dark:text-indigo-400" aria-hidden="true" />
                {label}
              </div>
            )
          })}
        </div>
      </Container>
    </section>
  )
}
