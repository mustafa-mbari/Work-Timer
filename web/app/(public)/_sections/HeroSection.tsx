import Image from 'next/image'
import Link from 'next/link'
import { Star, ArrowRight } from 'lucide-react'
import { getTranslations } from 'next-intl/server'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Container } from '@/components/layout'

interface Props {
  isLoggedIn: boolean
}

export async function HeroSection({ isLoggedIn }: Props) {
  const t = await getTranslations('landing.hero')

  return (
    <section className="relative pt-20 pb-8 sm:pt-28 sm:pb-12 overflow-hidden" aria-label="Hero">
      {/* Background gradient mesh */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[1400px] h-[700px] opacity-[0.07] dark:opacity-[0.12] blur-3xl"
          style={{ background: 'radial-gradient(ellipse at 30% 20%, #6366f1 0%, transparent 50%), radial-gradient(ellipse at 70% 60%, #a855f7 0%, transparent 50%)' }}
        />
      </div>

      <Container variant="marketing">
        {/* Centered text block */}
        <div className="relative text-center max-w-3xl mx-auto mb-14 sm:mb-20">
          <Badge variant="default" className="mb-6 inline-flex items-center gap-2 px-3.5 py-1.5 text-xs">
            <span className="relative flex h-2 w-2" aria-hidden="true">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500 dark:bg-indigo-400" />
            </span>
            {t('badge')}
          </Badge>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-[68px] font-extrabold text-stone-900 dark:text-stone-50 leading-[1.08] tracking-tight mb-6">
            {t('headlineStart')}{' '}
            <span className="bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500 bg-clip-text text-transparent">
              {t('headlineAccent')}
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-stone-500 dark:text-stone-400 max-w-2xl mx-auto mb-8 leading-relaxed">
            {t('subtitle')}
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-3">
            <Button
              asChild
              size="lg"
              className="shadow-lg shadow-indigo-500/25 dark:shadow-indigo-900/40 text-base px-8 h-12"
            >
              <a href="https://chrome.google.com/webstore">
                {t('ctaPrimary')}
                <ArrowRight className="h-4 w-4 ml-2" aria-hidden="true" />
              </a>
            </Button>
            {!isLoggedIn && (
              <Button asChild variant="outline" size="lg" className="text-base px-8 h-12">
                <Link href="/register">{t('ctaSecondary')}</Link>
              </Button>
            )}
          </div>

          <p className="text-sm text-stone-400 dark:text-stone-500 mb-8">
            {t('reassurance')}
          </p>

          {/* Social proof strip */}
          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
            <div className="flex items-center gap-0.5" aria-label={t('ratingLabel')}>
              {[0, 1, 2, 3, 4].map(i => (
                <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" aria-hidden="true" />
              ))}
              <span className="ml-1.5 text-sm font-medium text-stone-600 dark:text-stone-400">{t('rating')}</span>
            </div>
            <div className="h-4 w-px bg-stone-200 dark:bg-[var(--dark-border)] hidden sm:block" aria-hidden="true" />
            <span
              className="text-sm text-stone-500 dark:text-stone-400"
              dangerouslySetInnerHTML={{ __html: t.raw('usersCount') as string }}
            />
            <div className="h-4 w-px bg-stone-200 dark:bg-[var(--dark-border)] hidden sm:block" aria-hidden="true" />
            <span className="text-sm text-stone-500 dark:text-stone-400">{t('noAds')}</span>
          </div>
        </div>

        {/* Product screenshots — floating composition */}
        <div className="relative max-w-5xl mx-auto">
          {/* Glow behind screenshots */}
          <div
            className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[300px] opacity-[0.08] dark:opacity-[0.12] blur-3xl rounded-full"
            style={{ background: 'radial-gradient(ellipse, #6366f1 0%, transparent 70%)' }}
            aria-hidden="true"
          />

          <div className="relative flex items-start justify-center gap-4 sm:gap-6 lg:gap-8">
            {/* Left screenshot — timer/entries (3.png) */}
            <div className="hidden sm:block flex-none w-[220px] lg:w-[280px] mt-8 lg:mt-12">
              <div className="rounded-2xl lg:rounded-3xl border border-stone-200 dark:border-[var(--dark-border)] bg-white dark:bg-[var(--dark-card)] shadow-2xl shadow-stone-200/60 dark:shadow-black/30 overflow-hidden rotate-[-2deg] hover:rotate-0 transition-transform duration-500">
                <Image
                  src="/Extension_screen/3.png"
                  alt="Work Timer entries view showing daily goal progress and time entries"
                  width={520}
                  height={680}
                  className="w-[115%] max-w-none h-auto -ml-[7.5%] -my-2"
                  priority
                />
              </div>
            </div>

            {/* Center screenshot — main stopwatch (4.png) — largest */}
            <div className="flex-none w-[280px] sm:w-[300px] lg:w-[340px]">
              <div className="rounded-2xl lg:rounded-3xl border border-stone-200 dark:border-[var(--dark-border)] bg-white dark:bg-[var(--dark-card)] shadow-2xl shadow-stone-200/60 dark:shadow-black/30 overflow-hidden">
                <Image
                  src="/Extension_screen/4.png"
                  alt="Work Timer stopwatch recording time with flip-clock display"
                  width={520}
                  height={680}
                  className="w-[115%] max-w-none h-auto -ml-[7.5%] -my-2"
                  priority
                />
              </div>
            </div>

            {/* Right screenshot — stats (5.png) */}
            <div className="hidden sm:block flex-none w-[220px] lg:w-[280px] mt-8 lg:mt-12">
              <div className="rounded-2xl lg:rounded-3xl border border-stone-200 dark:border-[var(--dark-border)] bg-white dark:bg-[var(--dark-card)] shadow-2xl shadow-stone-200/60 dark:shadow-black/30 overflow-hidden rotate-[2deg] hover:rotate-0 transition-transform duration-500">
                <Image
                  src="/Extension_screen/5.png"
                  alt="Work Timer statistics with weekly charts and project breakdown"
                  width={520}
                  height={680}
                  className="w-[115%] max-w-none h-auto -ml-[7.5%] -my-2"
                  priority
                />
              </div>
            </div>
          </div>
        </div>
      </Container>
    </section>
  )
}
