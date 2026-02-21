import { getTranslations } from 'next-intl/server'
import { Badge } from '@/components/ui/badge'
import { Container, Section, SectionHeader } from '@/components/layout'
import { ACCENT_CLASSES } from '../_data/landing'
import { Timer, ShieldCheck, BarChart3 } from 'lucide-react'

// Icons mapped by index (order matches translation items array)
const FEATURE_ICONS = [Timer, ShieldCheck, BarChart3]
const FEATURE_ACCENTS = ['indigo', 'emerald', 'violet'] as const

export async function FeaturesSection() {
  const t = await getTranslations('landing.features')
  const items = t.raw('items') as Array<{ title: string; body: string }>

  return (
    <Section aria-label="Key features">
      <Container variant="marketing">
        <SectionHeader
          eyebrow={t('badge')}
          title={t('title')}
          subtitle={t('subtitle')}
        />

        <div className="space-y-20">
          {items.map((feature, idx) => {
            const Icon = FEATURE_ICONS[idx]
            const accent = ACCENT_CLASSES[FEATURE_ACCENTS[idx]]
            const isReversed = idx % 2 !== 0

            return (
              <div
                key={idx}
                className={`flex flex-row gap-16 items-center ${isReversed ? 'flex-row-reverse' : ''}`}
              >
                {/* Icon block */}
                <div className="flex-none w-[280px]">
                  <div className={`h-52 w-full rounded-2xl ${accent.bg} flex items-center justify-center`}>
                    <Icon
                      className={`h-28 w-28 ${accent.icon} opacity-80`}
                      strokeWidth={1.25}
                      aria-hidden="true"
                    />
                  </div>
                </div>

                {/* Text */}
                <div className="flex-1">
                  <div className={`inline-flex items-center gap-2 mb-3 px-2.5 py-1 rounded-full text-xs font-semibold ${accent.pill}`}>
                    <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                    {t('featureLabel')} {String(idx + 1).padStart(2, '0')}
                  </div>
                  <h3 className="text-2xl font-bold text-stone-900 dark:text-stone-100 mb-3">
                    {feature.title}
                  </h3>
                  <p className="text-stone-500 dark:text-stone-400 leading-relaxed max-w-prose">
                    {feature.body}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </Container>
    </Section>
  )
}
