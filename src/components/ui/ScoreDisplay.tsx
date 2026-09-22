import { Star } from 'lucide-react'
import { cn } from '@/lib/utils'
import { t } from '@/i18n/en'

interface ScoreDisplayProps {
  /** 1–10. El caller decide no renderizar nada si es `null`. */
  value: number
  className?: string
}

/** Puntaje en modo lectura (doc 06). Detrás del flag `ratings`, como `RatingStars`. */
export function ScoreDisplay({ value, className }: ScoreDisplayProps) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1 text-xs font-medium text-muted-foreground',
        className,
      )}
      title={t.lists.entry.ratingValue(value, 10)}
    >
      <Star className="size-3.5 fill-primary text-primary" aria-hidden />
      <span className="tabular-nums">{value}</span>
      <span className="sr-only">{t.lists.entry.ratingValue(value, 10)}</span>
    </span>
  )
}
