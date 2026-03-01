import { getTranslations } from 'next-intl/server'
import { Badge } from '@/components/ui/badge'
import { Container } from '@/components/layout'
import { Download, FolderPlus, Play } from 'lucide-react'

const STEP_ICONS = [Download, FolderPlus, Play]

export async function HowItWorksSection() {
  const t = await getTranslations('landing.howItWorks')
  const steps = t.raw('steps') as Array<{ title: string; desc: string }>

  return (
    <section className="py-24" aria-label="How it works">
      <Container variant="marketing">
        <div className="text-center mb-16">
          <Badge variant="secondary" className="mb-4">{t('badge')}</Badge>
          <h2 className="text-3xl sm:text-4xl font-bold text-stone-900 dark:text-stone-100 tracking-tight">
            {t('title')}
          </h2>
        </div>

        <div className="relative max-w-4xl mx-auto">
          {/* Connector line — horizontal on lg, vertical on mobile */}
          <div
            className="hidden lg:block absolute top-10 left-[calc(16.67%+2rem)] right-[calc(16.67%+2rem)] h-px bg-gradient-to-r from-indigo-200 via-violet-200 to-indigo-200 dark:from-indigo-800 dark:via-violet-800 dark:to-indigo-800"
            aria-hidden="true"
          />
          <div
            className="lg:hidden absolute top-10 bottom-10 left-6 w-px bg-gradient-to-b from-indigo-200 via-violet-200 to-indigo-200 dark:from-indigo-800 dark:via-violet-800 dark:to-indigo-800"
            aria-hidden="true"
          />

          <div className="flex flex-col lg:flex-row gap-8 lg:gap-0">
            {steps.map((step, idx) => {
              const Icon = STEP_ICONS[idx]
              return (
                <div key={idx} className="relative flex-1 flex flex-row lg:flex-col items-start lg:items-center text-left lg:text-center gap-5 lg:gap-0 lg:px-6">
                  {/* Step icon */}
                  <div className="relative z-10 shrink-0">
                    <div className="h-14 w-14 lg:h-16 lg:w-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/25 dark:shadow-indigo-900/40 lg:mb-6">
                      <Icon className="h-6 w-6 lg:h-7 lg:w-7 text-white" aria-hidden="true" />
                    </div>
                    <span
                      className="absolute -top-1.5 -right-1.5 h-6 w-6 rounded-full bg-white dark:bg-[var(--dark)] border-2 border-indigo-500 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-sm"
                      aria-label={`${t('stepLabel')} ${idx + 1}`}
                    >
                      {idx + 1}
                    </span>
                  </div>

                  <div>
                    <h3 className="font-bold text-stone-900 dark:text-stone-100 text-lg mb-1.5">{step.title}</h3>
                    <p className="text-sm text-stone-500 dark:text-stone-400 leading-relaxed lg:max-w-[240px]">
                      {step.desc}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </Container>
    </section>
  )
}
