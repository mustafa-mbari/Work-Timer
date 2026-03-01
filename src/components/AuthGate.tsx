import { WEBSITE_URL } from '@shared/constants'

interface AuthGateProps {
  signIn: () => void
  onStartGuest: () => void
}

export default function AuthGate({ signIn, onStartGuest }: AuthGateProps) {
  return (
    <div className="flex flex-col items-center justify-center h-[520px] bg-stone-50 dark:bg-dark px-8">
      {/* Logo with text */}
      <img
        src="/logos/WT_logoWithText.png"
        alt="Work Timer"
        className="h-[73px] mb-3 dark:brightness-110 dark:contrast-90"
      />
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

        {/* Guest option */}
        <button
          onClick={onStartGuest}
          className="w-full border border-dashed border-stone-300 dark:border-dark-border text-stone-500 dark:text-stone-400 py-2.5 rounded-xl text-sm font-medium hover:bg-stone-50 dark:hover:bg-dark-hover hover:border-stone-400 dark:hover:border-stone-500 transition-colors"
        >
          Try as Guest — Limited features
        </button>
      </div>
    </div>
  )
}
