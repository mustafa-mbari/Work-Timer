export default function SettingsLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div>
        <div className="h-8 w-28 bg-stone-200 dark:bg-[var(--dark-elevated)] rounded-lg" />
        <div className="h-4 w-48 bg-stone-100 dark:bg-[var(--dark-elevated)] rounded mt-2" />
      </div>
      {/* Tab bar */}
      <div className="flex gap-1 border-b border-stone-200 dark:border-[var(--dark-border)]">
        {[96, 112, 104, 80, 148].map((w, i) => (
          <div
            key={i}
            className="h-9 rounded-t bg-stone-100 dark:bg-[var(--dark-elevated)]"
            style={{ width: w }}
          />
        ))}
      </div>
      {/* Content card */}
      <div className="h-72 rounded-xl bg-stone-100 dark:bg-[var(--dark-elevated)]" />
    </div>
  )
}
