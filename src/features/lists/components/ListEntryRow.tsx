import { Link2, Play } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { EpisodeStepper } from '@/components/ui/EpisodeStepper'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { useUpdateEntryProgress } from '@/features/lists/hooks/useUpdateEntryProgress'
import { cn } from '@/lib/utils'
import { toProgress } from '@/utils/progress'
import { t } from '@/i18n/en'
import type { VersionEntry } from '@/features/lists/types'

interface ListEntryRowProps {
  /** `kind === "version"` con `version` presente — narrowado por el caller
   * vía `isVersionEntry` (nunca `!`/`as` acá). */
  entry: VersionEntry
  /**
   * Carpeta donde vive la fila. Ausente o `null` ⇒ **solo lectura**, sin
   * stepper: es lo que necesita la vista pública (`/profile/:id/list/:cid`),
   * que por contrato no puede escribir. El id hace falta para la `queryKey`
   * que el optimistic update parchea.
   */
  checklistId?: number | null
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
 * El stepper vive en su propio componente porque el hook de mutación no se
 * puede llamar condicionalmente, y la fila tiene que poder renderizarse
 * también en modo lectura (vista pública).
 */
function EntryProgressStepper({
  entry,
  checklistId,
}: {
  entry: VersionEntry
  checklistId: number
}) {
  const { setProgress } = useUpdateEntryProgress(checklistId, entry)

  return (
    <EpisodeStepper
      value={entry.version.watchedEpisodes}
      max={entry.version.totalEpisodes}
      name={entry.displayName}
      onChange={setProgress}
    />
  )
}

/**
 * Fila de un version-link suelto o agrupado bajo una franquicia (doc 06):
 * imagen, nombre, abreviación, `ProgressBar` y, cuando hay `checklistId`, el
 * `EpisodeStepper` con optimistic update (3.7).
 */
export function ListEntryRow({
  entry,
  checklistId,
  className,
}: ListEntryRowProps) {
  const progress = toProgress(
    entry.version.watchedEpisodes,
    entry.version.totalEpisodes,
  )

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
          <p className="truncate text-sm font-medium text-foreground">
            {entry.displayName}
          </p>
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
      {checklistId != null && (
        <EntryProgressStepper entry={entry} checklistId={checklistId} />
      )}
    </div>
  )
}
