import { Star } from 'lucide-react'
import { getTranslations } from 'next-intl/server'
import { Card, CardContent } from '@/components/ui/card'
import { Container, SectionHeader } from '@/components/layout'

interface TestimonialItem {
  initials: string
  name: string
  role: string
  quote: string
}

export async function TestimonialsSection() {
  const t = await getTranslations('landing.testimonials')
  const items = t.raw('items') as TestimonialItem[]
  const starsLabel = t('starsLabel')

  return (
    <section
      className="bg-stone-50 dark:bg-[var(--dark-card)] border-y border-stone-100 dark:border-[var(--dark-border)] py-20"
      aria-label="Testimonials"
    >
      <Container variant="marketing">
        <SectionHeader
          eyebrow={t('badge')}
          title={t('title')}
        />

        <div className="grid grid-cols-3 gap-6">
          {items.map((item, idx) => (
            <Card
              key={idx}
              className="bg-white dark:bg-[var(--dark)] border-stone-200 dark:border-[var(--dark-border)] flex flex-col"
            >
              <CardContent className="pt-6 flex flex-col flex-1">
                <div className="flex gap-0.5 mb-4" aria-label={`5 ${starsLabel}`}>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" aria-hidden="true" />
                  ))}
                </div>
                <p className="text-3xl text-stone-200 dark:text-[var(--dark-elevated)] leading-none mb-1 select-none font-serif" aria-hidden="true">
                  &ldquo;
                </p>
                <p className="text-sm text-stone-600 dark:text-stone-400 leading-relaxed flex-1 mb-6">
                  {item.quote}
                </p>
                <div className="flex items-center gap-3">
                  <div
                    className="h-9 w-9 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-xs font-bold text-indigo-700 dark:text-indigo-300 shrink-0"
                    aria-hidden="true"
                  >
                    {item.initials}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-stone-900 dark:text-stone-100">{item.name}</p>
                    <p className="text-xs text-stone-400 dark:text-stone-500">{item.role}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </Container>
    </section>
  )
}
