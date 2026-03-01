import Image from 'next/image'
import { getTranslations } from 'next-intl/server'
import { Container, Section, SectionHeader } from '@/components/layout'
import { Timer, ShieldCheck, BarChart3 } from 'lucide-react'

const FEATURE_ICONS = [Timer, ShieldCheck, BarChart3]

// Map each feature to an actual extension screenshot
const FEATURE_SCREENSHOTS = [
  { src: '/Extension_screen/4.png', alt: 'Stopwatch mode with flip-clock timer, project selector, and description field', width: 520, height: 680 },
  { src: '/Extension_screen/2.png', alt: 'Pomodoro focus timer in dark mode with circular progress ring', width: 520, height: 680 },
  { src: '/Extension_screen/5.png', alt: 'Statistics view with weekly bar charts and project breakdown', width: 520, height: 680 },
]

const FEATURE_ACCENTS = [
  { pill: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300', border: 'border-indigo-200 dark:border-indigo-800' },
  { pill: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300', border: 'border-emerald-200 dark:border-emerald-800' },
  { pill: 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300', border: 'border-violet-200 dark:border-violet-800' },
]

export async function FeaturesSection() {
  const t = await getTranslations('landing.features')
  const items = t.raw('items') as Array<{ title: string; body: string }>

  return (
    <Section
      className="bg-stone-50/50 dark:bg-[var(--dark-card)]/50 border-y border-stone-100 dark:border-[var(--dark-border)]"
      aria-label="Key features"
    >
      <Container variant="marketing">
        <p className="text-center text-sm font-medium text-indigo-500 dark:text-indigo-400 tracking-wide mb-6">
          {t('positioning')}
        </p>

        <SectionHeader
          eyebrow={t('badge')}
          title={t('title')}
          subtitle={t('subtitle')}
        />

        <div className="space-y-16 lg:space-y-24">
          {items.map((feature, idx) => {
            const Icon = FEATURE_ICONS[idx]
            const screenshot = FEATURE_SCREENSHOTS[idx]
            const accent = FEATURE_ACCENTS[idx]
            const isReversed = idx % 2 !== 0

            return (
              <div
                key={idx}
                className={`flex flex-col ${isReversed ? 'lg:flex-row-reverse' : 'lg:flex-row'} gap-10 lg:gap-16 items-center`}
              >
                {/* Screenshot block */}
                <div className="flex-none w-[260px] sm:w-[300px]">
                  <div className={`rounded-2xl border ${accent.border} bg-white dark:bg-[var(--dark-card)] shadow-xl shadow-stone-200/50 dark:shadow-black/20 overflow-hidden transition-transform duration-500 hover:scale-[1.02]`}>
                    <Image
                      src={screenshot.src}
                      alt={screenshot.alt}
                      width={screenshot.width}
                      height={screenshot.height}
                      className="w-[115%] max-w-none h-auto -ml-[7.5%] -my-2"
                    />
                  </div>
                </div>

                {/* Text */}
                <div className="flex-1 text-center lg:text-left">
                  <div className={`inline-flex items-center gap-2 mb-4 px-3 py-1.5 rounded-full text-xs font-semibold ${accent.pill}`}>
                    <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                    {t('featureLabel')} {String(idx + 1).padStart(2, '0')}
                  </div>
                  <h3 className="text-2xl lg:text-3xl font-bold text-stone-900 dark:text-stone-100 mb-3 tracking-tight">
                    {feature.title}
                  </h3>
                  <p className="text-stone-500 dark:text-stone-400 leading-relaxed max-w-prose text-[15px] lg:text-base">
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
