import { getTranslations } from 'next-intl/server'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('landing.hero')
  return {
    title: 'Work Timer — Free Chrome Time Tracker',
    description: t('subtitle'),
  }
}
import { HeroSection } from './_sections/HeroSection'
import { ProblemSection } from './_sections/ProblemSection'
import { FeaturesSection } from './_sections/FeaturesSection'
import { HowItWorksSection } from './_sections/HowItWorksSection'
import { FeatureGridSection } from './_sections/FeatureGridSection'
import { TestimonialsSection } from './_sections/TestimonialsSection'
import { PricingSection } from './_sections/PricingSection'
import { FaqSection } from './_sections/FaqSection'
import { CtaSection } from './_sections/CtaSection'

export default async function LandingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const isLoggedIn = !!user

  return (
    <div className="overflow-x-hidden">
      <HeroSection isLoggedIn={isLoggedIn} />
      <ProblemSection />
      <FeaturesSection />
      <HowItWorksSection />
      <FeatureGridSection />
      <TestimonialsSection />
      <PricingSection isLoggedIn={isLoggedIn} />
      <FaqSection />
      <CtaSection isLoggedIn={isLoggedIn} />
    </div>
  )
}
