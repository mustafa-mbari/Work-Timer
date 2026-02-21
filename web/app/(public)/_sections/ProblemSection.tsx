import { X, Check } from 'lucide-react'
import { getTranslations } from 'next-intl/server'
import { Badge } from '@/components/ui/badge'
import { Container } from '@/components/layout'

export async function ProblemSection() {
  const t = await getTranslations('landing.problem')
  const painPoints = t.raw('painPoints') as string[]
  const solutions = t.raw('solutions') as string[]

  return (
    <section
      className="bg-stone-50 dark:bg-[var(--dark-card)] border-y border-stone-100 dark:border-[var(--dark-border)] py-20"
      aria-label="Problem and solution"
    >
      <Container variant="marketing">
        <div className="text-center mb-12">
          <Badge variant="secondary" className="mb-4">{t('badge')}</Badge>
          <h2 className="text-3xl font-bold text-stone-900 dark:text-stone-100">
            {t('title')}
          </h2>
        </div>

        <div className="grid grid-cols-2 gap-12">
          {/* Pain points */}
          <div>
            <p className="text-xs font-semibold text-rose-600 dark:text-rose-400 uppercase tracking-widest mb-5">
              {t('painLabel')}
            </p>
            <ul className="space-y-4" aria-label="Common time tracking problems">
              {painPoints.map((point, idx) => (
                <li key={idx} className="flex items-start gap-3">
                  <div className="h-5 w-5 rounded-full bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center shrink-0 mt-0.5">
                    <X className="h-3 w-3 text-rose-600 dark:text-rose-400" aria-hidden="true" />
                  </div>
                  <span className="text-stone-600 dark:text-stone-400 text-sm leading-snug">{point}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Solutions */}
          <div>
            <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-5">
              {t('solutionLabel')}
            </p>
            <ul className="space-y-4" aria-label="How Work Timer solves these problems">
              {solutions.map((solution, idx) => (
                <li key={idx} className="flex items-start gap-3">
                  <div className="h-5 w-5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="h-3 w-3 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                  </div>
                  <span className="text-stone-700 dark:text-stone-300 text-sm font-medium leading-snug">{solution}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Container>
    </section>
  )
}
