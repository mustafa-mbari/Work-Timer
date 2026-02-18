interface Props {
  password: string
}

export default function PasswordStrengthIndicator({ password }: Props) {
  if (password.length === 0) return null

  const strength = password.length < 6 ? 1 : password.length < 8 ? 2 : 3
  const labels = ['', 'Weak', 'Fair', 'Strong']
  const colors = ['', 'bg-rose-500', 'bg-amber-500', 'bg-emerald-500']

  return (
    <div className="flex items-center gap-2 mt-1">
      <div className="flex-1 h-1 rounded-full bg-stone-200 dark:bg-[var(--dark-elevated)] overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${colors[strength]}`}
          style={{ width: `${(strength / 3) * 100}%` }}
        />
      </div>
      <span className="text-xs text-stone-500 dark:text-stone-400">{labels[strength]}</span>
    </div>
  )
}
