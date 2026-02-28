import { Clock, CheckCircle2, XCircle, AlertCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

type ShareStatus = 'open' | 'submitted' | 'approved' | 'denied' | 'overdue' | 'returned' | null | undefined

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'success' | 'warning' | 'destructive'; icon: React.ReactNode }> = {
  open:      { label: 'Open',      variant: 'warning',     icon: <Clock className="h-2.5 w-2.5" /> },
  submitted: { label: 'Pending',   variant: 'default',     icon: <Clock className="h-2.5 w-2.5" /> },
  approved:  { label: 'Approved',  variant: 'success',     icon: <CheckCircle2 className="h-2.5 w-2.5" /> },
  denied:    { label: 'Denied',    variant: 'destructive', icon: <XCircle className="h-2.5 w-2.5" /> },
  overdue:   { label: 'Overdue',   variant: 'destructive', icon: <AlertCircle className="h-2.5 w-2.5" /> },
  returned:  { label: 'Returned',  variant: 'warning',     icon: <AlertCircle className="h-2.5 w-2.5" /> },
}

interface StatusBadgeProps {
  status: ShareStatus
  showIcon?: boolean
  label?: string
  className?: string
}

export function StatusBadge({ status, showIcon = false, label, className }: StatusBadgeProps) {
  if (!status) {
    return <span className="text-xs text-stone-400 dark:text-stone-500">&mdash;</span>
  }

  const config = statusConfig[status]
  if (!config) {
    return <span className="text-xs text-stone-400 dark:text-stone-500">&mdash;</span>
  }

  return (
    <Badge variant={config.variant} className={showIcon ? `gap-1 ${className ?? ''}` : className}>
      {showIcon && config.icon}
      {label ?? config.label}
    </Badge>
  )
}

// Period type badge (Day / Week / Month)
type PeriodType = 'day' | 'week' | 'month'

const typeConfig: Record<string, { label: string; variant: 'warning' | 'default' | 'secondary' }> = {
  day:   { label: 'Day',   variant: 'warning' },
  week:  { label: 'Week',  variant: 'default' },
  month: { label: 'Month', variant: 'secondary' },
}

interface TypeBadgeProps {
  type: PeriodType | string
  className?: string
}

export function TypeBadge({ type, className }: TypeBadgeProps) {
  const config = typeConfig[type] ?? { label: type, variant: 'secondary' as const }
  return (
    <Badge variant={config.variant} className={className}>
      {config.label}
    </Badge>
  )
}
