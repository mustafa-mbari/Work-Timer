import { getTranslations } from 'next-intl/server'
import { Container, SectionHeader } from '@/components/layout'
import PricingPlans from '@/components/PricingPlans'

interface Props {
  isLoggedIn: boolean
}

export async function PricingSection({ isLoggedIn }: Props) {
  const t = await getTranslations('landing.pricing')

  return (
    <section className="py-20" id="pricing" aria-label="Pricing">
      <Container variant="marketing">
        <SectionHeader
          eyebrow={t('badge')}
          title={t('title')}
          subtitle={t('subtitle')}
        />
        <PricingPlans isLoggedIn={isLoggedIn} />
      </Container>
    </section>
  )
}
