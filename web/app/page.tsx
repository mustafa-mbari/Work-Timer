import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import PricingCard from '@/components/PricingCard'

const FEATURES = [
  { icon: '⏱', title: 'Stopwatch, Manual & Pomodoro', desc: 'Three timer modes to fit how you work. Switch anytime.' },
  { icon: '📁', title: 'Project Tracking', desc: 'Organize time by project with color labels and target hours.' },
  { icon: '📊', title: 'Weekly & Monthly Stats', desc: 'See where your time goes with clear charts and breakdowns.' },
  { icon: '🔒', title: 'Privacy First', desc: 'All data stored locally in your browser. No tracking, no ads.' },
  { icon: '☁️', title: 'Cloud Sync (Premium)', desc: 'Sync across all your devices with end-to-end Supabase sync.' },
  { icon: '📤', title: 'Export (Premium)', desc: 'Export your data to CSV or Excel for invoicing or reporting.' },
]

export default async function LandingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const isLoggedIn = !!user

  return (
    <div>
      {/* Hero */}
      <section className="max-w-5xl mx-auto px-6 pt-20 pb-16 text-center">
        <div className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-600 text-xs font-medium px-3 py-1.5 rounded-full mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
          Free Chrome Extension
        </div>
        <h1 className="text-5xl font-bold text-stone-900 leading-tight tracking-tight mb-4">
          Time tracking that<br />stays out of your way
        </h1>
        <p className="text-lg text-stone-500 max-w-xl mx-auto mb-8">
          A minimal, privacy-first timer in your browser. Works fully offline. No accounts required to start.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <a
            href="https://chrome.google.com/webstore"
            className="px-6 py-3 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl font-medium transition-colors shadow-sm"
          >
            Add to Chrome — It's free
          </a>
          {!isLoggedIn && (
            <Link
              href="/register"
              className="px-6 py-3 border border-stone-200 hover:bg-stone-50 text-stone-700 rounded-xl font-medium transition-colors"
            >
              Create account
            </Link>
          )}
        </div>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-6 py-16">
        <h2 className="text-2xl font-bold text-stone-900 text-center mb-10">Everything you need, nothing you don't</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map(f => (
            <div key={f.title} className="rounded-2xl border border-stone-100 bg-stone-50 p-5">
              <div className="text-2xl mb-3">{f.icon}</div>
              <h3 className="font-semibold text-stone-900 mb-1">{f.title}</h3>
              <p className="text-sm text-stone-500">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section className="max-w-5xl mx-auto px-6 py-16" id="pricing">
        <div className="text-center mb-10">
          <h2 className="text-2xl font-bold text-stone-900 mb-2">Simple, transparent pricing</h2>
          <p className="text-stone-500">Free forever for basic use. Upgrade when you need more.</p>
        </div>

        {/* Free tier callout */}
        <div className="rounded-2xl border border-stone-200 bg-white p-6 mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-stone-900">Free</h3>
              <span className="text-xs bg-stone-100 text-stone-500 px-2 py-0.5 rounded-full">Forever</span>
            </div>
            <p className="text-sm text-stone-500">Up to 5 projects · 30-day history · Local storage only</p>
          </div>
          <span className="text-2xl font-bold text-stone-900">$0</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <PricingCard plan="monthly" isLoggedIn={isLoggedIn} />
          <PricingCard plan="yearly" isLoggedIn={isLoggedIn} />
          <PricingCard plan="lifetime" isLoggedIn={isLoggedIn} />
        </div>
      </section>

      {/* CTA */}
      <section className="bg-indigo-500 py-16 mt-8">
        <div className="max-w-2xl mx-auto px-6 text-center">
          <h2 className="text-2xl font-bold text-white mb-3">Ready to track your time?</h2>
          <p className="text-indigo-100 mb-6">Install the extension and start in seconds. No sign up required.</p>
          <a
            href="https://chrome.google.com/webstore"
            className="inline-block px-6 py-3 bg-white text-indigo-600 font-medium rounded-xl hover:bg-indigo-50 transition-colors"
          >
            Add to Chrome — Free
          </a>
        </div>
      </section>
    </div>
  )
}
