import { Skeleton } from '@/components/ui/skeleton'

export default function AuthenticatedLoading() {
  return (
    <div className="space-y-6">
      {/* Page title skeleton */}
      <div>
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-64 mt-2" />
      </div>

      {/* Card skeletons */}
      <div className="rounded-2xl border border-stone-200 dark:border-[var(--dark-border)] p-6 space-y-4">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>

      <div className="rounded-2xl border border-stone-200 dark:border-[var(--dark-border)] p-6 space-y-4">
        <Skeleton className="h-5 w-40" />
        <div className="space-y-3">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      </div>
    </div>
  )
}
