import { Building2, User, GraduationCap, Briefcase } from 'lucide-react'
import { getTranslations } from 'next-intl/server'
import { Container } from '@/components/layout'

const CARD_ICONS = [Building2, User, GraduationCap, Briefcase]

const CARD_STYLES = [
  {
    gradient: 'from-indigo-500 to-blue-600',
    iconBg: 'bg-indigo-500/10 dark:bg-indigo-400/10',
    icon: 'text-indigo-600 dark:text-indigo-400',
    hoverBorder: 'hover:border-indigo-200 dark:hover:border-indigo-800',
    glow: 'group-hover:bg-indigo-500/5 dark:group-hover:bg-indigo-500/5',
  },
  {
    gradient: 'from-emerald-500 to-teal-600',
    iconBg: 'bg-emerald-500/10 dark:bg-emerald-400/10',
    icon: 'text-emerald-600 dark:text-emerald-400',
    hoverBorder: 'hover:border-emerald-200 dark:hover:border-emerald-800',
    glow: 'group-hover:bg-emerald-500/5 dark:group-hover:bg-emerald-500/5',
  },
  {
    gradient: 'from-amber-500 to-orange-600',
    iconBg: 'bg-amber-500/10 dark:bg-amber-400/10',
    icon: 'text-amber-600 dark:text-amber-400',
    hoverBorder: 'hover:border-amber-200 dark:hover:border-amber-800',
    glow: 'group-hover:bg-amber-500/5 dark:group-hover:bg-amber-500/5',
  },
  {
    gradient: 'from-violet-500 to-purple-600',
    iconBg: 'bg-violet-500/10 dark:bg-violet-400/10',
    icon: 'text-violet-600 dark:text-violet-400',
    hoverBorder: 'hover:border-violet-200 dark:hover:border-violet-800',
    glow: 'group-hover:bg-violet-500/5 dark:group-hover:bg-violet-500/5',
  },
]

export async function AudienceSection() {
  const t = await getTranslations('landing.audience')
  const cards = t.raw('cards') as Array<{ title: string; description: string }>

  return (
    <section className="relative py-24 overflow-hidden" aria-label="Who is Work Timer for">
      {/* Subtle background accent */}
      <div
        className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] opacity-[0.04] dark:opacity-[0.06] blur-3xl rounded-full"
        style={{ background: 'radial-gradient(ellipse, #6366f1 0%, transparent 70%)' }}
        aria-hidden="true"
      />

      <Container variant="marketing">
        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-bold text-stone-900 dark:text-stone-100 tracking-tight">
            {t('title')}
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 lg:gap-6">
          {cards.map((card, idx) => {
            const Icon = CARD_ICONS[idx]
            const style = CARD_STYLES[idx]

            return (
              <div
                key={idx}
                className={`group relative rounded-2xl border border-stone-200 dark:border-[var(--dark-border)] bg-white dark:bg-[var(--dark-card)] p-7 transition-all duration-300 ${style.hoverBorder} hover:shadow-lg hover:-translate-y-0.5`}
              >
                {/* Hover glow */}
                <div className={`absolute inset-0 rounded-2xl transition-colors duration-300 ${style.glow}`} aria-hidden="true" />

                <div className="relative">
                  {/* Icon with gradient bar */}
                  <div className="flex items-center gap-4 mb-4">
                    <div className={`flex items-center justify-center h-12 w-12 rounded-xl ${style.iconBg}`}>
                      <Icon className={`h-6 w-6 ${style.icon}`} strokeWidth={1.75} aria-hidden="true" />
                    </div>
                    <div className={`h-8 w-1 rounded-full bg-gradient-to-b ${style.gradient}`} aria-hidden="true" />
                  </div>

                  <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100 mb-2">
                    {card.title}
                  </h3>
                  <p className="text-[15px] text-stone-500 dark:text-stone-400 leading-relaxed">
                    {card.description}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </Container>
    </section>
  )
}
