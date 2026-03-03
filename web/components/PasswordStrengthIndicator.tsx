'use client'

import { useTranslations } from 'next-intl'

interface Props {
  password: string
}

export default function PasswordStrengthIndicator({ password }: Props) {
  const t = useTranslations('auth.register')
  if (password.length === 0) return null

  // Calculate strength based on multiple criteria
  let score = 0
  if (password.length >= 8) score++
  if (/[A-Z]/.test(password)) score++
  if (/[a-z]/.test(password)) score++
  if (/[0-9]/.test(password)) score++
  
  // Map score (0-4) to strength (1-3)
  // 0-1: Weak (1)
  // 2-3: Fair (2)
  // 4: Strong (3)
  const strength = score <= 1 ? 1 : score <= 3 ? 2 : 3
  
  const labels = ['', t('strengthWeak'), t('strengthFair'), t('strengthStrong')]
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
