import { getInitials } from './utils'

const sizeClasses = {
  sm: 'h-6 w-6 text-[10px]',
  md: 'h-7 w-7 text-xs',
  lg: 'h-8 w-8 text-xs',
} as const

interface MemberAvatarProps {
  name: string | null | undefined
  email: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function MemberAvatar({ name, email, size = 'md', className }: MemberAvatarProps) {
  return (
    <div
      className={`rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center font-semibold text-indigo-700 dark:text-indigo-300 shrink-0 ${sizeClasses[size]} ${className ?? ''}`}
    >
      {getInitials(name ?? null, email)}
    </div>
  )
}
