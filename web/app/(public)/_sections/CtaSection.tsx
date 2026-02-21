import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { getTranslations } from 'next-intl/server'
import { Button } from '@/components/ui/button'

interface Props {
  isLoggedIn: boolean
}

export async function CtaSection({ isLoggedIn }: Props) {
  const t = await getTranslations('landing.cta')

  return (
    <section className="py-24 relative overflow-hidden" aria-label="Call to action">
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 to-violet-600" aria-hidden="true" />
      <div className="absolute -top-24 -right-24 h-96 w-96 rounded-full bg-white/5 pointer-events-none" aria-hidden="true" />
      <div className="absolute -bottom-16 -left-16 h-64 w-64 rounded-full bg-white/5 pointer-events-none" aria-hidden="true" />

      <div className="relative max-w-2xl mx-auto px-8 text-center">
        <h2 className="text-4xl font-bold text-white mb-4 leading-tight">
          {t('title')}
        </h2>
        <p className="text-indigo-100 mb-8 text-lg">
          {t('subtitle')}
        </p>
        <div className="flex flex-row gap-3 justify-center">
          <Button
            asChild
            size="lg"
            className="bg-white text-indigo-600 hover:bg-indigo-50 shadow-xl font-semibold"
          >
            <a href="https://chrome.google.com/webstore">
              {t('ctaPrimary')}
              <ArrowRight className="h-4 w-4 ml-1" aria-hidden="true" />
            </a>
          </Button>
          {!isLoggedIn && (
            <Button
              asChild
              size="lg"
              variant="ghost"
              className="text-white hover:bg-white/10 border border-white/20"
            >
              <Link href="/register">{t('ctaSecondary')}</Link>
            </Button>
          )}
        </div>
        <p className="text-indigo-200/70 text-xs mt-6">
          {t('disclaimer')}
        </p>
      </div>
    </section>
  )
}
