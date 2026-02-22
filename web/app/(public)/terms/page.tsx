export default function TermsPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-100 mb-6">Terms of Service</h1>
      <div className="prose prose-stone dark:prose-invert max-w-none text-sm space-y-4 text-stone-600 dark:text-stone-400">
        <p>
          By using Work Timer, you agree to these terms. Work Timer is provided as-is for personal
          and professional time tracking purposes.
        </p>
        <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100 mt-8">Free Plan</h2>
        <p>
          The free plan includes up to 5 projects, 30-day history, and local-only storage.
          No account is required for the free plan.
        </p>
        <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100 mt-8">Premium Plan</h2>
        <p>
          Premium and All-In subscriptions are billed through Stripe. Monthly and yearly subscriptions auto-renew
          unless canceled.
        </p>
        <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100 mt-8">Cancellation</h2>
        <p>
          You may cancel your subscription at any time through the billing portal.
          Access continues until the end of your current billing period.
        </p>
      </div>
    </div>
  )
}
