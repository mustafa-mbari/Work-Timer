import { Skeleton } from '@/components/ui/skeleton'

export default function EntriesLoading() {
  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <div className="mb-6">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-24 mt-2" />
      </div>

      {/* Filters bar */}
      <div className="flex flex-wrap gap-3 mb-4">
        <Skeleton className="h-9 w-36" />
        <Skeleton className="h-9 w-36" />
        <Skeleton className="h-9 w-32" />
        <Skeleton className="h-9 w-32" />
        <Skeleton className="h-9 w-28 ml-auto" />
      </div>

      {/* Table */}
      <div className="rounded-xl border border-stone-200 dark:border-[var(--dark-border)] overflow-hidden">
        <div className="bg-stone-50 dark:bg-[var(--dark-card)] px-4 py-3 flex gap-4">
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-16" />
        </div>
        {Array.from({ length: 10 }).map((_, i) => (
          <div
            key={i}
            className="px-4 py-3 flex gap-4 border-t border-stone-100 dark:border-[var(--dark-border)]"
          >
            <Skeleton className="h-4 w-4" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  )
}
