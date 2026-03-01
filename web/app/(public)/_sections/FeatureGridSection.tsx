import { getTranslations } from 'next-intl/server'
import { Container, SectionHeader } from '@/components/layout'
import { Timer, FolderKanban, BarChart3, ShieldCheck, Cloud, FileSpreadsheet } from 'lucide-react'

const GRID_ICONS = [Timer, FolderKanban, BarChart3, ShieldCheck, Cloud, FileSpreadsheet]

const CARD_ACCENTS = [
  { iconBg: 'bg-indigo-100 dark:bg-indigo-900/30', icon: 'text-indigo-600 dark:text-indigo-400' },
  { iconBg: 'bg-violet-100 dark:bg-violet-900/30', icon: 'text-violet-600 dark:text-violet-400' },
  { iconBg: 'bg-emerald-100 dark:bg-emerald-900/30', icon: 'text-emerald-600 dark:text-emerald-400' },
  { iconBg: 'bg-rose-100 dark:bg-rose-900/30', icon: 'text-rose-600 dark:text-rose-400' },
  { iconBg: 'bg-sky-100 dark:bg-sky-900/30', icon: 'text-sky-600 dark:text-sky-400' },
  { iconBg: 'bg-amber-100 dark:bg-amber-900/30', icon: 'text-amber-600 dark:text-amber-400' },
]

export async function FeatureGridSection() {
  const t = await getTranslations('landing.featureGrid')
  const items = t.raw('items') as Array<{ title: string; desc: string }>

  return (
    <section
      className="py-24 bg-stone-50 dark:bg-[var(--dark-card)] border-y border-stone-100 dark:border-[var(--dark-border)]"
      aria-label="All features"
    >
      <Container variant="marketing">
        <SectionHeader
          title={t('title')}
          subtitle={t('subtitle')}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {items.map((f, idx) => {
            const Icon = GRID_ICONS[idx]
            const accent = CARD_ACCENTS[idx]
            return (
              <div
                key={idx}
                className="group relative rounded-2xl border border-stone-200 dark:border-[var(--dark-border)] bg-white dark:bg-[var(--dark)] p-6 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 hover:border-stone-300 dark:hover:border-[var(--dark-hover)]"
              >
                <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${accent.iconBg} mb-4 transition-transform duration-300 group-hover:scale-110`}>
                  <Icon className={`h-5 w-5 ${accent.icon}`} strokeWidth={1.75} aria-hidden="true" />
                </div>
                <h3 className="font-bold text-stone-900 dark:text-stone-100 mb-1.5">{f.title}</h3>
                <p className="text-sm text-stone-500 dark:text-stone-400 leading-relaxed">{f.desc}</p>
              </div>
            )
          })}
        </div>
      </Container>
    </section>
  )
}
