import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import PricingCard from '@/components/PricingCard'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Timer, FolderKanban, BarChart3, ShieldCheck, Cloud, FileSpreadsheet,
} from 'lucide-react'

const FEATURES = [
  { icon: Timer, title: 'Stopwatch, Manual & Pomodoro', desc: 'Three timer modes to fit how you work. Switch anytime.' },
  { icon: FolderKanban, title: 'Project Tracking', desc: 'Organize time by project with color labels and target hours.' },
  { icon: BarChart3, title: 'Weekly & Monthly Stats', desc: 'See where your time goes with clear charts and breakdowns.' },
  { icon: ShieldCheck, title: 'Privacy First', desc: 'All data stored locally in your browser. No tracking, no ads.' },
  { icon: Cloud, title: 'Cloud Sync (Premium)', desc: 'Sync across all your devices with end-to-end Supabase sync.' },
  { icon: FileSpreadsheet, title: 'Export (Premium)', desc: 'Export your data to CSV or Excel for invoicing or reporting.' },
]

export default async function LandingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const isLoggedIn = !!user

  return (
    <div>
      {/* Hero */}
      <section className="max-w-5xl mx-auto px-6 pt-20 pb-16 text-center">
        <Badge variant="default" className="mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 dark:bg-indigo-400 mr-1.5" />
          Free Chrome Extension
        </Badge>
        <h1 className="text-4xl sm:text-5xl font-bold text-stone-900 dark:text-stone-100 leading-tight tracking-tight mb-4">
          Time tracking that<br />stays out of your way
        </h1>
        <p className="text-lg text-stone-500 dark:text-stone-400 max-w-xl mx-auto mb-8">
          A minimal, privacy-first timer in your browser. Works fully offline. No accounts required to start.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild size="lg">
            <a href="https://chrome.google.com/webstore">
              Add to Chrome &mdash; It&apos;s free
            </a>
          </Button>
          {!isLoggedIn && (
            <Button asChild variant="outline" size="lg">
              <Link href="/register">Create account</Link>
            </Button>
          )}
        </div>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-6 py-16">
        <h2 className="text-2xl font-bold text-stone-900 dark:text-stone-100 text-center mb-10">
          Everything you need, nothing you don&apos;t
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map(f => (
            <Card key={f.title} className="bg-stone-50 dark:bg-[var(--dark-card)] border-stone-100 dark:border-[var(--dark-border)]">
              <CardContent className="pt-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 dark:bg-indigo-900/30 mb-3">
                  <f.icon className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <h3 className="font-semibold text-stone-900 dark:text-stone-100 mb-1">{f.title}</h3>
                <p className="text-sm text-stone-500 dark:text-stone-400">{f.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section className="max-w-5xl mx-auto px-6 py-16" id="pricing">
        <div className="text-center mb-10">
          <h2 className="text-2xl font-bold text-stone-900 dark:text-stone-100 mb-2">Simple, transparent pricing</h2>
          <p className="text-stone-500 dark:text-stone-400">Free forever for basic use. Upgrade when you need more.</p>
        </div>

        {/* Free tier callout */}
        <Card className="mb-6">
          <CardContent className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-stone-900 dark:text-stone-100">Free</h3>
                <Badge variant="secondary">Forever</Badge>
              </div>
              <p className="text-sm text-stone-500 dark:text-stone-400">Up to 5 projects &middot; 30-day history &middot; Local storage only</p>
            </div>
            <span className="text-2xl font-bold text-stone-900 dark:text-stone-100">$0</span>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <PricingCard plan="monthly" isLoggedIn={isLoggedIn} />
          <PricingCard plan="yearly" isLoggedIn={isLoggedIn} />
          <PricingCard plan="lifetime" isLoggedIn={isLoggedIn} />
        </div>
      </section>

      {/* CTA */}
      <section className="bg-indigo-500 dark:bg-indigo-600 py-16 mt-8">
        <div className="max-w-2xl mx-auto px-6 text-center">
          <h2 className="text-2xl font-bold text-white mb-3">Ready to track your time?</h2>
          <p className="text-indigo-100 mb-6">Install the extension and start in seconds. No sign up required.</p>
          <Button asChild size="lg" variant="secondary" className="bg-white text-indigo-600 hover:bg-indigo-50">
            <a href="https://chrome.google.com/webstore">
              Add to Chrome &mdash; Free
            </a>
          </Button>
        </div>
      </section>
    </div>
  )
}
