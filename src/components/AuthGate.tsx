import { WEBSITE_URL } from '@shared/constants'

interface AuthGateProps {
  signIn: () => void
}

export default function AuthGate({ signIn }: AuthGateProps) {
  return (
    <div className="flex flex-col items-center justify-center h-[520px] bg-stone-50 dark:bg-dark px-8">
      {/* Logo */}
      <div className="w-16 h-16 rounded-2xl bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center mb-5">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-indigo-500 dark:text-indigo-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      </div>

      <h1 className="text-lg font-bold text-stone-800 dark:text-stone-100 mb-1">Work Timer</h1>
      <p className="text-xs text-stone-400 dark:text-stone-400 text-center mb-8 max-w-[240px]">
        Sign in or create an account to start tracking your work time.
      </p>

      <div className="w-full max-w-[260px] flex flex-col gap-3">
        <button
          onClick={signIn}
          className="w-full bg-indigo-500 hover:bg-indigo-600 text-white py-2.5 rounded-xl text-sm font-medium transition-colors shadow-sm"
        >
          Sign in
        </button>
        <button
          onClick={() => chrome.tabs.create({ url: `${WEBSITE_URL}/register` })}
          className="w-full border border-stone-200 dark:border-dark-border text-stone-600 dark:text-stone-300 py-2.5 rounded-xl text-sm font-medium hover:bg-stone-50 dark:hover:bg-dark-hover transition-colors"
        >
          Create account
        </button>
      </div>
    </div>
  )
}
