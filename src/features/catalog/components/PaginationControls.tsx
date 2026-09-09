import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { t } from '@/i18n/en'

interface PaginationControlsProps {
  page: number
  pageSize: number
  total: number
  onPageChange: (page: number) => void
  className?: string
}

/** Paginación clásica v1 (doc 06): no se muestra si todo entra en una página. */
export function PaginationControls({
  page,
  pageSize,
  total,
  onPageChange,
  className,
}: PaginationControlsProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  if (totalPages <= 1) return null

  return (
    <nav
      aria-label="Pagination"
      className={cn('flex items-center justify-center gap-4', className)}
    >
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
      >
        <ChevronLeft className="size-4" aria-hidden />
        {t.common.previous}
      </Button>
      <span className="text-sm text-muted-foreground">
        {t.common.pageOf(page, totalPages)}
      </span>
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
      >
        {t.common.next}
        <ChevronRight className="size-4" aria-hidden />
      </Button>
    </nav>
  )
}
