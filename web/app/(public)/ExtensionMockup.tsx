// Server component — pure CSS/JSX, no client state needed

// HH, MM, SS as separate flip-clock tiles
const TIMER_GROUPS = ['02', '34', '15'] as const

export default function ExtensionMockup() {
  return (
    <div className="relative w-full">
      {/* Glow halo behind the popup */}
      <div
        className="absolute inset-0 rounded-2xl blur-3xl opacity-20 dark:opacity-30 -z-10"
        style={{ background: 'radial-gradient(ellipse at center, #6366f1 0%, transparent 70%)' }}
        aria-hidden="true"
      />

      {/* Extension popup shell */}
      <div className="relative rounded-2xl border border-stone-200 dark:border-indigo-500/40 bg-white dark:bg-[var(--dark-card)] shadow-2xl shadow-indigo-100/60 dark:shadow-indigo-900/50 overflow-hidden ring-1 ring-indigo-300/20 dark:ring-indigo-500/20">

        {/* Compact header bar */}
        <div className="flex items-center justify-between px-3 py-1.5 border-b border-stone-100 dark:border-[var(--dark-border)] bg-stone-50/60 dark:bg-[var(--dark-elevated)]/40">
          <div className="flex items-center gap-1.5">
            {/* Mini clock icon */}
            <svg viewBox="0 0 14 14" className="w-3 h-3 text-indigo-500" fill="none" aria-hidden="true">
              <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.5" />
              <path d="M7 4v3l2 1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="text-[9px] font-semibold text-stone-500 dark:text-stone-400 tracking-wider uppercase leading-none">
              Work Timer
            </span>
          </div>
          <div className="flex gap-1" aria-hidden="true">
            <div className="h-1.5 w-1.5 rounded-full bg-stone-300 dark:bg-[var(--dark-border)]" />
            <div className="h-1.5 w-1.5 rounded-full bg-stone-300 dark:bg-[var(--dark-border)]" />
          </div>
        </div>

        <div className="px-4 py-3 space-y-3">
          {/* Fake project selector */}
          <div className="flex items-center gap-2 rounded-lg border border-stone-200 dark:border-[var(--dark-border)] bg-stone-50 dark:bg-[var(--dark-elevated)] px-3 py-2">
            <div className="h-2.5 w-2.5 rounded-full bg-indigo-500 shrink-0" aria-hidden="true" />
            <span className="text-xs text-stone-600 dark:text-stone-400 flex-1 truncate">
              Client Project — Frontend
            </span>
            <svg viewBox="0 0 12 12" fill="none" className="w-3 h-3 text-stone-400 shrink-0" aria-hidden="true">
              <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>

          {/* Flip-clock timer — matches real RollingTimer appearance */}
          <div
            className="flex items-center justify-center gap-2 py-2"
            role="timer"
            aria-label="Timer showing 2 hours 34 minutes 15 seconds"
          >
            {TIMER_GROUPS.map((group, gi) => (
              <div key={gi} className="flex items-center gap-2">
                {gi > 0 && (
                  <span
                    className="text-2xl font-semibold text-stone-400 dark:text-stone-500 tabular-nums -mt-1"
                    style={{ fontFamily: "'Roboto', 'Helvetica Neue', Helvetica, Arial, sans-serif" }}
                    aria-hidden="true"
                  >
                    :
                  </span>
                )}
                {/* Tile for each digit pair */}
                <div className="relative flex mockup-tile rounded-xl overflow-hidden px-1">
                  {group.split('').map((digit, di) => (
                    <div
                      key={di}
                      className="flex items-center justify-center"
                      style={{ width: 34, height: 60 }}
                    >
                      <span
                        className="text-[42px] font-semibold leading-none text-stone-900"
                        style={{ fontFamily: "'Roboto', 'Helvetica Neue', Helvetica, Arial, sans-serif" }}
                      >
                        {digit}
                      </span>
                    </div>
                  ))}
                  {/* Gradient overlay — 3D drum effect */}
                  <div className="absolute inset-0 pointer-events-none mockup-tile-gradient" aria-hidden="true" />
                </div>
              </div>
            ))}
          </div>

          {/* Running indicator */}
          <div className="flex items-center justify-center gap-1.5 -mt-1">
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" aria-hidden="true" />
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Running</span>
          </div>

          {/* Fake description input */}
          <div className="rounded-lg border border-stone-200 dark:border-[var(--dark-border)] bg-stone-50 dark:bg-[var(--dark-elevated)] px-3 py-2">
            <span className="text-xs text-stone-400 dark:text-stone-500">Implementing auth flow...</span>
          </div>

          {/* Fake controls: Pause + Stop */}
          <div className="flex gap-2">
            <div className="flex-1 rounded-lg bg-amber-100 dark:bg-amber-900/30 py-2.5 flex items-center justify-center gap-1.5 cursor-default">
              <svg viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" aria-hidden="true">
                <rect x="3" y="2" width="3" height="12" rx="1" />
                <rect x="10" y="2" width="3" height="12" rx="1" />
              </svg>
              <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">Pause</span>
            </div>
            <div className="flex-1 rounded-lg bg-rose-100 dark:bg-rose-900/30 py-2.5 flex items-center justify-center gap-1.5 cursor-default">
              <svg viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" aria-hidden="true">
                <rect x="2" y="2" width="12" height="12" rx="2" />
              </svg>
              <span className="text-xs font-semibold text-rose-700 dark:text-rose-400">Stop</span>
            </div>
          </div>
        </div>

        {/* Bottom tab nav */}
        <div className="flex border-t border-stone-100 dark:border-[var(--dark-border)]" role="tablist" aria-label="Extension views">
          {(['Timer', 'Week', 'Stats'] as const).map((label, i) => (
            <div
              key={label}
              role="tab"
              aria-selected={i === 0}
              className={[
                'flex-1 py-2.5 text-center text-[10px] font-medium transition-colors',
                i === 0
                  ? 'text-indigo-600 dark:text-indigo-400 border-t-2 border-indigo-500 -mt-px'
                  : 'text-stone-400 dark:text-stone-500',
              ].join(' ')}
            >
              {label}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
