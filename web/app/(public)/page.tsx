import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Smart focus timer for work, study, and projects',
  description:
    'Work Timer is a clean, online focus timer for work, study, and side projects. Start Pomodoro sessions, track your time, and improve your daily productivity in the browser.',
}

import { HeroSection } from './_sections/HeroSection'
import { AudienceSection } from './_sections/AudienceSection'
import { FeaturesSection } from './_sections/FeaturesSection'
import { HowItWorksSection } from './_sections/HowItWorksSection'
import { FeatureGridSection } from './_sections/FeatureGridSection'
import { TestimonialsSection } from './_sections/TestimonialsSection'
import { PricingSection } from './_sections/PricingSection'
import { FaqSection } from './_sections/FaqSection'
import { CtaSection } from './_sections/CtaSection'

export default function LandingPage() {
  return (
    <div className="overflow-x-hidden">
      <HeroSection isLoggedIn={false} />
      <AudienceSection />
      <FeaturesSection />
      <HowItWorksSection />
      <FeatureGridSection />
      <TestimonialsSection />
      <PricingSection isLoggedIn={false} />
      <FaqSection />
      <CtaSection isLoggedIn={false} />
    </div>
  )
}
