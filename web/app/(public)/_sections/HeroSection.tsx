import Link from 'next/link'
import { Star } from 'lucide-react'
import { getTranslations } from 'next-intl/server'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Container } from '@/components/layout'
import ExtensionMockup from '../ExtensionMockup'

interface Props {
  isLoggedIn: boolean
}

export async function HeroSection({ isLoggedIn }: Props) {
  const t = await getTranslations('landing.hero')

  return (
    <section className="relative pt-20 pb-24" aria-label="Hero">
      {/* Radial glow — decorative */}
      <div
        className="pointer-events-none absolute -top-20 left-1/2 -translate-x-1/2 w-[800px] h-[500px] opacity-[0.07] dark:opacity-[0.13] blur-3xl rounded-full"
        style={{ background: 'radial-gradient(ellipse, #6366f1 0%, transparent 70%)' }}
        aria-hidden="true"
      />

      <Container variant="marketing">
        <div className="relative flex flex-row items-center justify-between gap-16">
          {/* Left: copy */}
          <div className="flex-1 min-w-0 max-w-[600px]">
            <Badge variant="default" className="mb-6 inline-flex">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 dark:bg-indigo-400 mr-1.5" aria-hidden="true" />
              {t('badge')}
            </Badge>

            <h1 className="text-6xl font-bold text-stone-900 dark:text-stone-100 leading-[1.1] tracking-tight mb-5">
              {t('headlineStart')}{' '}
              <span className="bg-gradient-to-r from-indigo-500 to-violet-500 bg-clip-text text-transparent">
                {t('headlineAccent')}
              </span>
            </h1>

            <p className="text-xl text-stone-500 dark:text-stone-400 max-w-lg mb-8 leading-relaxed">
              {t('subtitle')}
            </p>

            <div className="flex flex-row gap-3 mb-10">
              <Button asChild size="lg" className="shadow-lg shadow-indigo-200/50 dark:shadow-indigo-900/30">
                <a href="https://chrome.google.com/webstore">
                  {t('ctaPrimary')}
                </a>
              </Button>
              {!isLoggedIn && (
                <Button asChild variant="outline" size="lg">
                  <Link href="/register">{t('ctaSecondary')}</Link>
                </Button>
              )}
            </div>

            {/* Social proof strip */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-0.5" aria-label={t('ratingLabel')}>
                {[0, 1, 2, 3, 4].map(i => (
                  <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" aria-hidden="true" />
                ))}
                <span className="ml-1.5 text-sm font-medium text-stone-600 dark:text-stone-400">{t('rating')}</span>
              </div>
              <div className="h-4 w-px bg-stone-200 dark:bg-[var(--dark-border)]" aria-hidden="true" />
              <span
                className="text-sm text-stone-500 dark:text-stone-400"
                dangerouslySetInnerHTML={{ __html: t.raw('usersCount') as string }}
              />
              <div className="h-4 w-px bg-stone-200 dark:bg-[var(--dark-border)]" aria-hidden="true" />
              <span className="text-sm text-stone-500 dark:text-stone-400">{t('noAds')}</span>
            </div>
          </div>

          {/* Right: extension mockup */}
          <div className="flex-none w-[320px]">
            <ExtensionMockup />
          </div>
        </div>
      </Container>
    </section>
  )
}
