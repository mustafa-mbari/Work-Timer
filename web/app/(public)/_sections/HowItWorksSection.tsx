import { getTranslations } from 'next-intl/server'
import { Badge } from '@/components/ui/badge'
import { Container } from '@/components/layout'
import { Download, FolderPlus, Play } from 'lucide-react'

const STEP_ICONS = [Download, FolderPlus, Play]

export async function HowItWorksSection() {
  const t = await getTranslations('landing.howItWorks')
  const steps = t.raw('steps') as Array<{ title: string; desc: string }>

  return (
    <section
      className="bg-stone-50 dark:bg-[var(--dark-card)] border-y border-stone-100 dark:border-[var(--dark-border)] py-20"
      aria-label="How it works"
    >
      <Container variant="marketing">
        <div className="text-center mb-14">
          <Badge variant="secondary" className="mb-4">{t('badge')}</Badge>
          <h2 className="text-3xl font-bold text-stone-900 dark:text-stone-100">
            {t('title')}
          </h2>
        </div>

        <div className="relative flex flex-row gap-0">
          {/* Horizontal connector line */}
          <div
            className="absolute top-8 left-[calc(16.67%+2rem)] right-[calc(16.67%+2rem)] h-px bg-stone-200 dark:bg-[var(--dark-border)]"
            aria-hidden="true"
          />

          {steps.map((step, idx) => {
            const Icon = STEP_ICONS[idx]
            return (
              <div key={idx} className="relative flex-1 flex flex-col items-center text-center px-4">
                <div className="relative z-10 h-16 w-16 rounded-2xl bg-indigo-600 flex items-center justify-center mb-5 shadow-lg shadow-indigo-200/60 dark:shadow-indigo-900/40">
                  <Icon className="h-7 w-7 text-white" aria-hidden="true" />
                  <span
                    className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-white dark:bg-[var(--dark-card)] border-2 border-indigo-600 text-[10px] font-bold text-indigo-600 flex items-center justify-center"
                    aria-label={`${t('stepLabel')} ${idx + 1}`}
                  >
                    {idx + 1}
                  </span>
                </div>
                <h3 className="font-bold text-stone-900 dark:text-stone-100 mb-2">{step.title}</h3>
                <p className="text-sm text-stone-500 dark:text-stone-400 leading-relaxed max-w-[220px]">
                  {step.desc}
                </p>
              </div>
            )
          })}
        </div>
      </Container>
    </section>
  )
}
