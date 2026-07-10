import { cn } from '@/lib/utils'
import type { Genre } from '@/features/catalog/types'

/**
 * Mapa estático colorIndex (1–11) -> clase de color. Estático a propósito:
 * Tailwind no detecta clases construidas dinámicamente (`bg-genre-${i}`).
 */
const DOT_CLASS: Record<number, string> = {
  1: 'bg-genre-1',
  2: 'bg-genre-2',
  3: 'bg-genre-3',
  4: 'bg-genre-4',
  5: 'bg-genre-5',
  6: 'bg-genre-6',
  7: 'bg-genre-7',
  8: 'bg-genre-8',
  9: 'bg-genre-9',
  10: 'bg-genre-10',
  11: 'bg-genre-11',
}

interface GenreBadgeProps {
  genre: Genre
  className?: string
}

export function GenreBadge({ genre, className }: GenreBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary/60 px-2 py-0.5 text-xs font-medium text-secondary-foreground',
        className,
      )}
    >
      <span
        className={cn(
          'size-1.5 rounded-full',
          DOT_CLASS[genre.colorIndex] ?? 'bg-muted-foreground',
        )}
        aria-hidden
      />
      {genre.name}
    </span>
  )
}
