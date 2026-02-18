import { BarChart2 } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

interface Props {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: { label: string; href: string }
}

export default function EmptyState({ icon, title, description, action }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
      <div className="text-stone-300 dark:text-stone-600">
        {icon ?? <BarChart2 className="h-12 w-12" />}
      </div>
      <div>
        <p className="text-base font-medium text-stone-700 dark:text-stone-300">{title}</p>
        {description && (
          <p className="text-sm text-stone-400 dark:text-stone-500 mt-1">{description}</p>
        )}
      </div>
      {action && (
        <Button asChild size="sm" variant="outline">
          <Link href={action.href}>{action.label}</Link>
        </Button>
      )}
    </div>
  )
}
