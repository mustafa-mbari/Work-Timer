import { getTranslations } from 'next-intl/server'
import { Card, CardContent } from '@/components/ui/card'
import { Container, SectionHeader } from '@/components/layout'
import { Timer, FolderKanban, BarChart3, ShieldCheck, Cloud, FileSpreadsheet } from 'lucide-react'

const GRID_ICONS = [Timer, FolderKanban, BarChart3, ShieldCheck, Cloud, FileSpreadsheet]

export async function FeatureGridSection() {
  const t = await getTranslations('landing.featureGrid')
  const items = t.raw('items') as Array<{ title: string; desc: string }>

  return (
    <section className="py-20" aria-label="All features">
      <Container variant="marketing">
        <SectionHeader
          title={t('title')}
          subtitle={t('subtitle')}
        />

        <div className="grid grid-cols-3 gap-5">
          {items.map((f, idx) => {
            const Icon = GRID_ICONS[idx]
            return (
              <Card
                key={idx}
                className="bg-stone-50 dark:bg-[var(--dark-card)] border-stone-100 dark:border-[var(--dark-border)] hover:shadow-md transition-shadow duration-200"
              >
                <CardContent className="pt-6">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 dark:bg-indigo-900/30 mb-3">
                    <Icon className="h-5 w-5 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
                  </div>
                  <h3 className="font-semibold text-stone-900 dark:text-stone-100 mb-1">{f.title}</h3>
                  <p className="text-sm text-stone-500 dark:text-stone-400 leading-relaxed">{f.desc}</p>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </Container>
    </section>
  )
}
