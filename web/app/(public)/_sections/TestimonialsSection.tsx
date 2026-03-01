import { Star, Quote } from 'lucide-react'
import { getTranslations } from 'next-intl/server'
import { Container, SectionHeader } from '@/components/layout'

interface TestimonialItem {
  initials: string
  name: string
  role: string
  quote: string
}

const AVATAR_GRADIENTS = [
  'from-indigo-500 to-violet-500',
  'from-emerald-500 to-teal-500',
  'from-amber-500 to-orange-500',
]

export async function TestimonialsSection() {
  const t = await getTranslations('landing.testimonials')
  const items = t.raw('items') as TestimonialItem[]
  const starsLabel = t('starsLabel')

  return (
    <section className="py-24" aria-label="Testimonials">
      <Container variant="marketing">
        <SectionHeader
          eyebrow={t('badge')}
          title={t('title')}
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {items.map((item, idx) => (
            <div
              key={idx}
              className="group relative rounded-2xl border border-stone-200 dark:border-[var(--dark-border)] bg-white dark:bg-[var(--dark-card)] p-7 flex flex-col transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5"
            >
              {/* Decorative quote icon */}
              <Quote
                className="absolute top-6 right-6 h-8 w-8 text-stone-100 dark:text-[var(--dark-elevated)] rotate-180"
                strokeWidth={1.5}
                aria-hidden="true"
              />

              <div className="flex gap-0.5 mb-5" aria-label={`5 ${starsLabel}`}>
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" aria-hidden="true" />
                ))}
              </div>

              <p className="text-[15px] text-stone-600 dark:text-stone-300 leading-relaxed flex-1 mb-8">
                &ldquo;{item.quote}&rdquo;
              </p>

              <div className="flex items-center gap-3 pt-5 border-t border-stone-100 dark:border-[var(--dark-border)]">
                <div
                  className={`h-10 w-10 rounded-full bg-gradient-to-br ${AVATAR_GRADIENTS[idx]} flex items-center justify-center text-xs font-bold text-white shrink-0 shadow-sm`}
                  aria-hidden="true"
                >
                  {item.initials}
                </div>
                <div>
                  <p className="text-sm font-semibold text-stone-900 dark:text-stone-100">{item.name}</p>
                  <p className="text-xs text-stone-400 dark:text-stone-500">{item.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Container>
    </section>
  )
}
