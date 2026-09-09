import { Link2, Play } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { cn } from '@/lib/utils'
import { toProgress } from '@/utils/progress'
import { t } from '@/i18n/en'
import type { ListEntry } from '@/features/lists/types'

interface ListEntryRowProps {
  /** `kind === "version"` con `version` presente — narrowado por el caller
   * vía `isVersionEntry` (nunca `!`/`as` acá). */
  entry: ListEntry & { version: NonNullable<ListEntry['version']> }
  className?: string
}

function EntryThumbnail({ imageUrl }: { imageUrl: string | null }) {
  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt=""
        loading="lazy"
        className="size-12 shrink-0 rounded-md object-cover"
      />
    )
  }
  return (
    <div className="flex size-12 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
      <Play className="size-5" aria-hidden />
    </div>
  )
}

/**
 * Fila de un version-link suelto o agrupado bajo una franquicia (doc 06,
 * §3.6 — modo lectura): imagen, nombre, abreviación, `ProgressBar`. Sin
 * stepper de episodios ni menú de edición (– / +) — eso es 3.7, sobre el
 * mismo modelo de datos pero con mutación optimista.
 */
export function ListEntryRow({ entry, className }: ListEntryRowProps) {
  const progress = toProgress(entry.version.watchedEpisodes, entry.version.totalEpisodes)

  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-md border border-border bg-card px-3 py-2',
        className,
      )}
    >
      <EntryThumbnail imageUrl={entry.imageUrl} />
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <p className="truncate text-sm font-medium text-foreground">{entry.displayName}</p>
          {entry.version.abbreviation && (
            <Badge variant="outline" className="shrink-0">
              {entry.version.abbreviation}
            </Badge>
          )}
          {entry.version.isSynced && (
            <Badge variant="secondary" className="shrink-0 gap-1">
              <Link2 className="size-3" aria-hidden />
              {t.lists.entry.synced}
            </Badge>
          )}
        </div>
        <ProgressBar progress={progress} />
      </div>
    </div>
  )
}
