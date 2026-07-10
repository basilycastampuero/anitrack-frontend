import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

type SkeletonVariant = 'card-grid' | 'detail-header' | 'list-rows' | 'tree'

interface LoadingSkeletonProps {
  variant: SkeletonVariant
  count?: number
  className?: string
}

/**
 * Skeleton con la forma exacta del contenido (doc 06, regla transversal 1):
 * nunca un spinner de página. Las variantes cubren las pantallas del Sprint 1–3.
 */
export function LoadingSkeleton({
  variant,
  count = 6,
  className,
}: LoadingSkeletonProps) {
  switch (variant) {
    case 'card-grid':
      return (
        <div
          className={cn(
            'grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6',
            className,
          )}
        >
          {Array.from({ length: count }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="aspect-[2/3] w-full rounded-lg" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          ))}
        </div>
      )
    case 'detail-header':
      return (
        <div className={cn('flex flex-col gap-4 sm:flex-row', className)}>
          <Skeleton className="aspect-[2/3] w-40 shrink-0 rounded-lg" />
          <div className="flex-1 space-y-3">
            <Skeleton className="h-8 w-2/3" />
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-20 w-full" />
          </div>
        </div>
      )
    case 'list-rows':
      return (
        <div className={cn('space-y-2', className)}>
          {Array.from({ length: count }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="size-12 shrink-0 rounded-md" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-3 w-1/4" />
              </div>
            </div>
          ))}
        </div>
      )
    case 'tree':
      return (
        <div className={cn('space-y-2', className)}>
          {Array.from({ length: count }).map((_, i) => (
            <Skeleton
              key={i}
              className="h-8"
              style={{ width: `${70 - (i % 3) * 12}%` }}
            />
          ))}
        </div>
      )
  }
}
