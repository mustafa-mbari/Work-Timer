import { getTranslations } from 'next-intl/server'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Container, SectionHeader } from '@/components/layout'

export async function FaqSection() {
  const t = await getTranslations('landing.faq')
  const items = t.raw('items') as Array<{ q: string; a: string }>

  return (
    <section
      className="bg-stone-50 dark:bg-[var(--dark-card)] border-y border-stone-100 dark:border-[var(--dark-border)] py-20"
      aria-label="Frequently asked questions"
    >
      <Container variant="marketing">
        <SectionHeader
          eyebrow={t('badge')}
          title={t('title')}
        />

        <div className="max-w-3xl mx-auto">
          <Accordion type="single" collapsible className="w-full space-y-2">
            {items.map((faq, idx) => (
              <AccordionItem
                key={idx}
                value={`faq-${idx}`}
                className="rounded-xl border border-stone-200 dark:border-[var(--dark-border)] bg-white dark:bg-[var(--dark)] px-5 data-[state=open]:border-indigo-200 dark:data-[state=open]:border-indigo-800"
              >
                <AccordionTrigger className="text-sm font-semibold text-stone-900 dark:text-stone-100 hover:no-underline py-4 text-left">
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent className="text-sm text-stone-500 dark:text-stone-400 leading-relaxed pb-4">
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </Container>
    </section>
  )
}
