import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import PricingCard from '@/components/PricingCard'
import ExtensionMockup from './ExtensionMockup'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Timer, FolderKanban, BarChart3, ShieldCheck, Cloud, FileSpreadsheet,
  Download, FolderPlus, Play, Star, Check, X, ArrowRight,
  WifiOff, Zap,
} from 'lucide-react'

// ─── Static data ──────────────────────────────────────────────────────────────

const PRIMARY_FEATURES = [
  {
    icon: Timer,
    title: 'Three Modes, One Extension',
    body: 'Stopwatch, manual entry, or disciplined Pomodoro focus sessions — switch any time. Your project and description carry over automatically so you never lose context.',
    accent: 'indigo',
  },
  {
    icon: ShieldCheck,
    title: 'Your Data, Your Browser',
    body: 'Everything is stored directly in your browser via chrome.storage.local. No server ever sees your data unless you choose cloud sync. Works fully offline — on a plane, in a cabin, wherever you work.',
    accent: 'emerald',
  },
  {
    icon: BarChart3,
    title: 'Know Your Patterns',
    body: 'Weekly and monthly analytics: time by project, daily session charts, and export-ready breakdowns for invoicing. Spot where your hours go and reclaim your focus.',
    accent: 'violet',
  },
] as const

type AccentKey = 'indigo' | 'emerald' | 'violet'

const ACCENT_CLASSES: Record<AccentKey, { bg: string; icon: string; pill: string }> = {
  indigo: {
    bg: 'bg-indigo-50 dark:bg-indigo-900/20',
    icon: 'text-indigo-500 dark:text-indigo-400',
    pill: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300',
  },
  emerald: {
    bg: 'bg-emerald-50 dark:bg-emerald-900/20',
    icon: 'text-emerald-600 dark:text-emerald-400',
    pill: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300',
  },
  violet: {
    bg: 'bg-violet-50 dark:bg-violet-900/20',
    icon: 'text-violet-600 dark:text-violet-400',
    pill: 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300',
  },
}

const STEPS = [
  {
    icon: Download,
    title: 'Install in seconds',
    desc: 'Click "Add to Chrome". No permissions beyond storage and alarms. The extension icon appears instantly in your toolbar.',
  },
  {
    icon: FolderPlus,
    title: 'Create a project',
    desc: 'Name it, pick a colour, set an optional hour target. Takes 10 seconds. Up to 5 projects on the free plan.',
  },
  {
    icon: Play,
    title: 'Start tracking',
    desc: 'Hit the play button. Pause for breaks. Stop when done. Your history builds automatically — nothing to remember.',
  },
]

const ALL_FEATURES = [
  { icon: Timer, title: 'Stopwatch, Manual & Pomodoro', desc: 'Three timer modes. Switch anytime, description carries over.' },
  { icon: FolderKanban, title: 'Project Tracking', desc: 'Colour-coded projects with optional hour targets.' },
  { icon: BarChart3, title: 'Weekly & Monthly Stats', desc: 'Clear charts showing exactly where your time goes.' },
  { icon: ShieldCheck, title: 'Privacy First', desc: 'Data lives in your browser. No tracking, no ads.' },
  { icon: Cloud, title: 'Cloud Sync (Premium)', desc: 'Sync across all your devices in real time.' },
  { icon: FileSpreadsheet, title: 'Export (Premium)', desc: 'Export to CSV or Excel for invoicing or reporting.' },
]

const TESTIMONIALS = [
  {
    initials: 'SK',
    name: 'Sarah K.',
    role: 'Freelance Designer',
    quote: "I've tried every time tracker out there. Work Timer is the first one I actually keep using. It's in my browser, doesn't nag me, and just works.",
    stars: 5,
  },
  {
    initials: 'MT',
    name: 'Marcus T.',
    role: 'Software Engineer',
    quote: 'The Pomodoro integration alone is worth it. I pair it with my project board and know exactly how long each feature took. Billing clients is a breeze.',
    stars: 5,
  },
  {
    initials: 'PR',
    name: 'Priya R.',
    role: 'Agency Project Manager',
    quote: "We needed something the whole team could use without an IT budget. The free tier covers 80% of what we need, and the yearly plan is a no-brainer.",
    stars: 5,
  },
]

const PAIN_POINTS = [
  'Losing track of billable hours across client projects',
  'Spreadsheets you forget to update mid-task',
  'Apps that need an account just to start a timer',
  'Heavy desktop apps eating RAM and disk space',
]

const SOLUTIONS = [
  'One click to start — no login, no setup required',
  'Lives in your browser toolbar, always one click away',
  'All data stays on your device by default, offline-first',
  "Cloud sync across devices when you're ready (Premium)",
]

const FAQS = [
  {
    q: 'Do I need an account to use it?',
    a: 'No. The extension works completely offline with zero account required. Create an account only when you want cloud sync or access to the companion dashboard.',
  },
  {
    q: 'Where is my data stored?',
    a: 'Locally in your browser via chrome.storage.local. Premium users can optionally enable Supabase cloud sync — your data is never sold or shared with third parties.',
  },
  {
    q: "What's the difference between Free and Premium?",
    a: 'Free gives you up to 5 projects, 30 days of history, and all three timer modes. Premium unlocks unlimited projects, full history, CSV & Excel export, cloud sync, and advanced analytics.',
  },
  {
    q: 'Can I export my time entries?',
    a: 'Yes, with a Premium plan. Export to CSV or Excel filtered by project and date range — formatted and ready for client invoicing.',
  },
  {
    q: 'Does it work offline?',
    a: 'Entirely. The extension uses browser storage and Chrome alarms — no internet connection is ever required. Cloud sync runs in the background when connectivity is available.',
  },
  {
    q: 'Is there a mobile app?',
    a: 'Work Timer is a Chrome extension today. A companion web dashboard is available for Premium users at w-timer.com for analytics and entry management on any screen.',
  },
]

const TRUST_BADGES = [
  { icon: ShieldCheck, label: 'Privacy first' },
  { icon: WifiOff, label: 'Offline-first' },
  { icon: Zap, label: 'No account needed' },
]

// ─── Shared container class ───────────────────────────────────────────────────
const CONTAINER = 'max-w-[1600px] mx-auto px-8 lg:px-12 xl:px-16'

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function LandingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const isLoggedIn = !!user

  return (
    <div className="overflow-x-hidden">

      {/* ── 1. HERO ─────────────────────────────────────────────────────────── */}
      <section className={`relative ${CONTAINER} pt-20 pb-24`} aria-label="Hero">
        {/* Faint radial glow — decorative */}
        <div
          className="pointer-events-none absolute -top-20 left-1/2 -translate-x-1/2 w-[800px] h-[500px] opacity-[0.07] dark:opacity-[0.13] blur-3xl rounded-full"
          style={{ background: 'radial-gradient(ellipse, #6366f1 0%, transparent 70%)' }}
          aria-hidden="true"
        />

        <div className="relative flex flex-col lg:flex-row items-center justify-between gap-12 lg:gap-16">
          {/* Left: copy */}
          <div className="flex-1 min-w-0 max-w-[640px] mx-auto lg:mx-0 text-center lg:text-left">
            <Badge variant="default" className="mb-6 inline-flex">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 dark:bg-indigo-400 mr-1.5" aria-hidden="true" />
              Free Chrome Extension
            </Badge>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold text-stone-900 dark:text-stone-100 leading-[1.1] tracking-tight mb-5">
              Stop Guessing{' '}
              <span className="bg-gradient-to-r from-indigo-500 to-violet-500 bg-clip-text text-transparent">
                Where Your Time Goes
              </span>
            </h1>

            <p className="text-lg lg:text-xl text-stone-500 dark:text-stone-400 max-w-lg mx-auto lg:mx-0 mb-8 leading-relaxed">
              Work Timer is a free Chrome extension that quietly tracks every hour — no friction, no account required. Just open it and start.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start mb-10">
              <Button asChild size="lg" className="shadow-lg shadow-indigo-200/50 dark:shadow-indigo-900/30">
                <a href="https://chrome.google.com/webstore">
                  Add to Chrome &mdash; It&apos;s Free
                </a>
              </Button>
              {!isLoggedIn && (
                <Button asChild variant="outline" size="lg">
                  <Link href="/register">Create Free Account</Link>
                </Button>
              )}
            </div>

            {/* Social proof strip */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 justify-center lg:justify-start">
              <div className="flex items-center gap-0.5" aria-label="5 star rating">
                {[0, 1, 2, 3, 4].map(i => (
                  <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" aria-hidden="true" />
                ))}
                <span className="ml-1.5 text-sm font-medium text-stone-600 dark:text-stone-400">5.0</span>
              </div>
              <div className="h-4 w-px bg-stone-200 dark:bg-[var(--dark-border)]" aria-hidden="true" />
              <span className="text-sm text-stone-500 dark:text-stone-400">
                Trusted by <strong className="text-stone-700 dark:text-stone-300">2,400+</strong> professionals
              </span>
              <div className="h-4 w-px bg-stone-200 dark:bg-[var(--dark-border)]" aria-hidden="true" />
              <span className="text-sm text-stone-500 dark:text-stone-400">No ads, ever</span>
            </div>
          </div>

          {/* Right: Extension mockup */}
          <div className="flex-none w-full sm:w-[380px] lg:w-[360px] xl:w-[320px] mx-auto lg:mx-0">
            <ExtensionMockup />
          </div>
        </div>
      </section>

      {/* ── 2. PROBLEM / SOLUTION BRIDGE ────────────────────────────────────── */}
      <section className="bg-stone-50 dark:bg-[var(--dark-card)] border-y border-stone-100 dark:border-[var(--dark-border)] py-20" aria-label="Problem and solution">
        <div className={CONTAINER}>
          <div className="text-center mb-12">
            <Badge variant="secondary" className="mb-4">Sound familiar?</Badge>
            <h2 className="text-2xl sm:text-3xl font-bold text-stone-900 dark:text-stone-100">
              Time tracking shouldn&apos;t feel like extra work
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
            {/* Pain points */}
            <div>
              <p className="text-xs font-semibold text-rose-600 dark:text-rose-400 uppercase tracking-widest mb-5">The problem</p>
              <ul className="space-y-4" aria-label="Common time tracking problems">
                {PAIN_POINTS.map(point => (
                  <li key={point} className="flex items-start gap-3">
                    <div className="h-5 w-5 rounded-full bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center shrink-0 mt-0.5">
                      <X className="h-3 w-3 text-rose-600 dark:text-rose-400" aria-hidden="true" />
                    </div>
                    <span className="text-stone-600 dark:text-stone-400 text-sm leading-snug">{point}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Solutions */}
            <div>
              <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-5">Work Timer fixes this</p>
              <ul className="space-y-4" aria-label="How Work Timer solves these problems">
                {SOLUTIONS.map(solution => (
                  <li key={solution} className="flex items-start gap-3">
                    <div className="h-5 w-5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center shrink-0 mt-0.5">
                      <Check className="h-3 w-3 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                    </div>
                    <span className="text-stone-700 dark:text-stone-300 text-sm font-medium leading-snug">{solution}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── 3. PRIMARY FEATURES (alternating) ───────────────────────────────── */}
      <section className="py-24" aria-label="Key features">
        <div className={CONTAINER}>
          <div className="text-center mb-16">
            <Badge variant="default" className="mb-4">Features</Badge>
            <h2 className="text-2xl sm:text-3xl font-bold text-stone-900 dark:text-stone-100">
              Built for real work, not demos
            </h2>
            <p className="text-stone-500 dark:text-stone-400 mt-3 max-w-lg mx-auto">
              Every feature exists because someone needed it. Nothing is here just to fill a pricing table.
            </p>
          </div>

          <div className="space-y-20">
            {PRIMARY_FEATURES.map((feature, idx) => {
              const Icon = feature.icon
              const accent = ACCENT_CLASSES[feature.accent]
              const isReversed = idx % 2 !== 0

              return (
                <div
                  key={feature.title}
                  className={`flex flex-col gap-10 items-center ${isReversed ? 'md:flex-row-reverse' : 'md:flex-row'}`}
                >
                  {/* Icon block */}
                  <div className="flex-none w-full max-w-[240px] mx-auto md:mx-0">
                    <div className={`h-48 w-full rounded-2xl ${accent.bg} flex items-center justify-center`}>
                      <Icon className={`h-24 w-24 ${accent.icon} opacity-80`} strokeWidth={1.25} aria-hidden="true" />
                    </div>
                  </div>

                  {/* Text */}
                  <div className="flex-1 text-center md:text-left">
                    <div className={`inline-flex items-center gap-2 mb-3 px-2.5 py-1 rounded-full text-xs font-semibold ${accent.pill}`}>
                      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                      Feature {String(idx + 1).padStart(2, '0')}
                    </div>
                    <h3 className="text-xl sm:text-2xl font-bold text-stone-900 dark:text-stone-100 mb-3">
                      {feature.title}
                    </h3>
                    <p className="text-stone-500 dark:text-stone-400 leading-relaxed max-w-prose">
                      {feature.body}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── 4. HOW IT WORKS ─────────────────────────────────────────────────── */}
      <section className="bg-stone-50 dark:bg-[var(--dark-card)] border-y border-stone-100 dark:border-[var(--dark-border)] py-20" aria-label="How it works">
        <div className={CONTAINER}>
          <div className="text-center mb-14">
            <Badge variant="secondary" className="mb-4">How it works</Badge>
            <h2 className="text-2xl sm:text-3xl font-bold text-stone-900 dark:text-stone-100">
              Up and running in under a minute
            </h2>
          </div>

          <div className="relative flex flex-col md:flex-row gap-8 md:gap-0">
            {/* Horizontal connector line (desktop only) */}
            <div
              className="hidden md:block absolute top-8 left-[calc(16.67%+2rem)] right-[calc(16.67%+2rem)] h-px bg-stone-200 dark:bg-[var(--dark-border)]"
              aria-hidden="true"
            />

            {STEPS.map((step, idx) => {
              const Icon = step.icon
              return (
                <div key={step.title} className="relative flex-1 flex flex-col items-center text-center px-4">
                  <div className="relative z-10 h-16 w-16 rounded-2xl bg-indigo-600 flex items-center justify-center mb-5 shadow-lg shadow-indigo-200/60 dark:shadow-indigo-900/40">
                    <Icon className="h-7 w-7 text-white" aria-hidden="true" />
                    <span
                      className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-white dark:bg-[var(--dark-card)] border-2 border-indigo-600 text-[10px] font-bold text-indigo-600 flex items-center justify-center"
                      aria-label={`Step ${idx + 1}`}
                    >
                      {idx + 1}
                    </span>
                  </div>
                  <h3 className="font-bold text-stone-900 dark:text-stone-100 mb-2">{step.title}</h3>
                  <p className="text-sm text-stone-500 dark:text-stone-400 leading-relaxed max-w-[220px]">
                    {step.desc}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── 5. FULL FEATURES GRID ───────────────────────────────────────────── */}
      <section className={`py-20 ${CONTAINER}`} aria-label="All features">
        <div className="text-center mb-12">
          <h2 className="text-2xl font-bold text-stone-900 dark:text-stone-100 mb-2">
            Everything you need, nothing you don&apos;t
          </h2>
          <p className="text-stone-500 dark:text-stone-400">
            Powerful enough for professionals, simple enough for anyone.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {ALL_FEATURES.map(f => {
            const Icon = f.icon
            return (
              <Card
                key={f.title}
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
      </section>

      {/* ── 6. TESTIMONIALS ─────────────────────────────────────────────────── */}
      <section className="bg-stone-50 dark:bg-[var(--dark-card)] border-y border-stone-100 dark:border-[var(--dark-border)] py-20" aria-label="Testimonials">
        <div className={CONTAINER}>
          <div className="text-center mb-12">
            <Badge variant="default" className="mb-4">Testimonials</Badge>
            <h2 className="text-2xl sm:text-3xl font-bold text-stone-900 dark:text-stone-100">
              People who actually use it
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TESTIMONIALS.map(t => (
              <Card
                key={t.name}
                className="bg-white dark:bg-[var(--dark)] border-stone-200 dark:border-[var(--dark-border)] flex flex-col"
              >
                <CardContent className="pt-6 flex flex-col flex-1">
                  <div className="flex gap-0.5 mb-4" aria-label={`${t.stars} out of 5 stars`}>
                    {Array.from({ length: t.stars }).map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" aria-hidden="true" />
                    ))}
                  </div>
                  <p className="text-3xl text-stone-200 dark:text-[var(--dark-elevated)] leading-none mb-1 select-none font-serif" aria-hidden="true">&ldquo;</p>
                  <p className="text-sm text-stone-600 dark:text-stone-400 leading-relaxed flex-1 mb-6">
                    {t.quote}
                  </p>
                  <div className="flex items-center gap-3">
                    <div
                      className="h-9 w-9 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-xs font-bold text-indigo-700 dark:text-indigo-300 shrink-0"
                      aria-hidden="true"
                    >
                      {t.initials}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-stone-900 dark:text-stone-100">{t.name}</p>
                      <p className="text-xs text-stone-400 dark:text-stone-500">{t.role}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ── 7. PRICING ──────────────────────────────────────────────────────── */}
      <section className={`py-20 ${CONTAINER}`} id="pricing" aria-label="Pricing">
        <div className="text-center mb-12">
          <Badge variant="secondary" className="mb-4">Pricing</Badge>
          <h2 className="text-2xl sm:text-3xl font-bold text-stone-900 dark:text-stone-100 mb-2">
            Simple, transparent pricing
          </h2>
          <p className="text-stone-500 dark:text-stone-400">
            Free forever for essential use. Upgrade when you need more.
          </p>
        </div>

        <Card className="mb-6 border-stone-200 dark:border-[var(--dark-border)]">
          <CardContent className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-stone-900 dark:text-stone-100">Free Plan</h3>
                <Badge variant="secondary">Forever</Badge>
              </div>
              <p className="text-sm text-stone-500 dark:text-stone-400">
                5 projects &middot; 30-day history &middot; All timer modes &middot; Local storage only
              </p>
            </div>
            <div className="text-right shrink-0">
              <span className="text-3xl font-bold text-stone-900 dark:text-stone-100">$0</span>
              <p className="text-xs text-stone-400 dark:text-stone-500 mt-0.5">No credit card required</p>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <PricingCard plan="monthly" isLoggedIn={isLoggedIn} />
          <PricingCard plan="yearly" isLoggedIn={isLoggedIn} />
          <PricingCard plan="lifetime" isLoggedIn={isLoggedIn} />
        </div>

        <div className="flex flex-wrap gap-6 justify-center mt-8">
          {TRUST_BADGES.map(b => {
            const Icon = b.icon
            return (
              <div key={b.label} className="flex items-center gap-2 text-sm text-stone-500 dark:text-stone-400">
                <Icon className="h-4 w-4 text-indigo-500 dark:text-indigo-400" aria-hidden="true" />
                {b.label}
              </div>
            )
          })}
        </div>
      </section>

      {/* ── 8. FAQ ──────────────────────────────────────────────────────────── */}
      <section className="bg-stone-50 dark:bg-[var(--dark-card)] border-y border-stone-100 dark:border-[var(--dark-border)] py-20" aria-label="Frequently asked questions">
        <div className={CONTAINER}>
          <div className="text-center mb-12">
            <Badge variant="secondary" className="mb-4">FAQ</Badge>
            <h2 className="text-2xl sm:text-3xl font-bold text-stone-900 dark:text-stone-100">
              Frequently asked questions
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {FAQS.map(faq => (
              <div
                key={faq.q}
                className="rounded-xl border border-stone-200 dark:border-[var(--dark-border)] bg-white dark:bg-[var(--dark)] p-5"
              >
                <h3 className="font-semibold text-stone-900 dark:text-stone-100 mb-2 text-sm leading-snug">
                  {faq.q}
                </h3>
                <p className="text-sm text-stone-500 dark:text-stone-400 leading-relaxed">
                  {faq.a}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 9. FINAL CTA ────────────────────────────────────────────────────── */}
      <section className="py-24 relative overflow-hidden" aria-label="Call to action">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 to-violet-600" aria-hidden="true" />
        <div className="absolute -top-24 -right-24 h-96 w-96 rounded-full bg-white/5 pointer-events-none" aria-hidden="true" />
        <div className="absolute -bottom-16 -left-16 h-64 w-64 rounded-full bg-white/5 pointer-events-none" aria-hidden="true" />

        <div className="relative max-w-2xl mx-auto px-6 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4 leading-tight">
            Your most productive week starts with one click.
          </h2>
          <p className="text-indigo-100 mb-8 text-lg">
            Install Work Timer for free and see where your time actually goes. No sign-up required to start.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              asChild
              size="lg"
              className="bg-white text-indigo-600 hover:bg-indigo-50 shadow-xl font-semibold"
            >
              <a href="https://chrome.google.com/webstore">
                Add to Chrome &mdash; Free
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
                <Link href="/register">Create an Account</Link>
              </Button>
            )}
          </div>
          <p className="text-indigo-200/70 text-xs mt-6">
            No credit card required &middot; Works offline &middot; Free forever for core features
          </p>
        </div>
      </section>

    </div>
  )
}
