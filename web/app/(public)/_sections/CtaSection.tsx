import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { getTranslations } from 'next-intl/server'
import { Button } from '@/components/ui/button'
import { CHROME_STORE_URL } from '@/lib/shared/constants'

interface Props {
  isLoggedIn: boolean
}

export async function CtaSection({ isLoggedIn }: Props) {
  const t = await getTranslations('landing.cta')

  return (
    <section className="py-24 relative overflow-hidden" aria-label="Call to action">
      {/* Gradient background with mesh effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700" aria-hidden="true" />
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 50%, white 1px, transparent 1px)',
          backgroundSize: '40px 40px, 40px 40px',
          backgroundPosition: '0 0, 20px 20px',
        }}
        aria-hidden="true"
      />

      {/* Floating decorative shapes */}
      <div className="absolute -top-20 -right-20 h-80 w-80 rounded-full bg-white/[0.07] blur-sm" aria-hidden="true" />
      <div className="absolute -bottom-16 -left-16 h-64 w-64 rounded-full bg-white/[0.05]" aria-hidden="true" />
      <div className="absolute top-1/2 left-1/4 h-32 w-32 rounded-full bg-white/[0.03] blur-xl" aria-hidden="true" />

      <div className="relative max-w-2xl mx-auto px-8 text-center">
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white mb-5 leading-tight tracking-tight">
          {t('title')}
        </h2>
        <p className="text-indigo-100 mb-4 text-lg sm:text-xl leading-relaxed">
          {t('subtitle')}
        </p>
        <p className="text-indigo-200/80 text-sm font-medium mb-10">
          {t('socialProof')}
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            asChild
            size="lg"
            className="bg-white text-indigo-600 hover:bg-indigo-50 shadow-xl shadow-indigo-900/30 font-semibold text-base px-8 h-12"
          >
            <a href={CHROME_STORE_URL}>
              {t('ctaPrimary')}
              <ArrowRight className="h-4 w-4 ml-2" aria-hidden="true" />
            </a>
          </Button>
          {!isLoggedIn && (
            <Button
              asChild
              size="lg"
              variant="ghost"
              className="text-white hover:bg-white/10 border border-white/25 text-base px-8 h-12"
            >
              <Link href="/register">{t('ctaSecondary')}</Link>
            </Button>
          )}
        </div>
        <p className="text-indigo-200/70 text-xs mt-8">
          {t('disclaimer')}
        </p>
        <p className="text-indigo-200/50 text-xs mt-2">
          By creating an account you agree to our{' '}
          <Link href="/privacy" className="underline underline-offset-2 hover:text-indigo-100 transition-colors">
            Privacy Policy
          </Link>
          {' '}and{' '}
          <Link href="/terms" className="underline underline-offset-2 hover:text-indigo-100 transition-colors">
            Terms of Service
          </Link>
          .
        </p>
      </div>
    </section>
  )
}
