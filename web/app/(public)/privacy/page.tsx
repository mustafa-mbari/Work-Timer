export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-100 mb-6">Privacy Policy</h1>
      <div className="prose prose-stone dark:prose-invert max-w-none text-sm space-y-4 text-stone-600 dark:text-stone-400">
        <p>
          Work Timer is a privacy-first time tracking tool. Your time entries are stored locally in your browser
          by default and are never shared with third parties.
        </p>
        <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100 mt-8">Data Collection</h2>
        <p>
          If you create an account and enable cloud sync, your time entries, projects, and settings are stored
          securely in our database (powered by Supabase). We collect only the data necessary to provide the service.
        </p>
        <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100 mt-8">Payments</h2>
        <p>
          Payment processing is handled by Stripe. We do not store your credit card information.
          Stripe&apos;s privacy policy applies to payment data.
        </p>
        <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100 mt-8">Contact</h2>
        <p>
          For privacy-related questions, please contact us through our GitHub repository.
        </p>
      </div>
    </div>
  )
}
