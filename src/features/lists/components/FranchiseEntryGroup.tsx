import { useState } from 'react'
import { ChevronRight, Film } from 'lucide-react'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { ListEntryRow } from '@/features/lists/components/ListEntryRow'
import { formatAggregatedProgress } from '@/features/lists/utils/progress'
import { isVersionEntry } from '@/features/lists/types'
import { cn } from '@/lib/utils'
import type { ListEntry } from '@/features/lists/types'

interface FranchiseEntryGroupProps {
  /** `kind === "franchise"`: agrupa sus version-links (`childEntries`). */
  entry: ListEntry
  /** Se pasa tal cual a cada hijo: ausente ⇒ grupo de solo lectura. */
  checklistId?: number | null
  className?: string
}

function GroupThumbnail({ imageUrl }: { imageUrl: string | null }) {
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
      <Film className="size-5" aria-hidden />
    </div>
  )
}

/**
 * Grupo colapsable de un franchise-link (doc 06, §3.6 — modo lectura):
 * header con el progreso agregado (`[S1 12/12] - [S2 03/-]`, formateado por
 * `progress.ts` a partir del `aggregatedProgress` pre-calculado del
 * contrato — el frontend no suma nada acá) y sus version-links adentro,
 * cada uno una `ListEntryRow`.
 *
 * El progreso solo se muestra si `showProgress` (`lf_show_episodes` de
 * Odoo) es `true`: mismo criterio que `compute_show_name`, que directamente
 * omite esa parte del string cuando el usuario apagó "mostrar episodios"
 * para esta franquicia.
 */
export function FranchiseEntryGroup({
  entry,
  checklistId,
  className,
}: FranchiseEntryGroupProps) {
  const [open, setOpen] = useState(true)
  const children = (entry.childEntries ?? []).filter(isVersionEntry)
  const groups = entry.aggregatedProgress?.groups ?? []
  const progressLabel =
    entry.showProgress && groups.length > 0
      ? formatAggregatedProgress(groups)
      : null

  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className={cn('rounded-md border border-border bg-card', className)}
    >
      <CollapsibleTrigger className="flex w-full items-center gap-3 px-3 py-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <ChevronRight
          className={cn(
            'size-4 shrink-0 text-muted-foreground transition-transform',
            open && 'rotate-90',
          )}
          aria-hidden
        />
        <GroupThumbnail imageUrl={entry.imageUrl} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground">
            {entry.displayName}
          </p>
          {progressLabel && (
            <p className="truncate text-xs tabular-nums text-muted-foreground">
              {progressLabel}
            </p>
          )}
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-2 border-t border-border px-3 py-2">
        {children.map((child) => (
          <ListEntryRow
            key={child.linkId}
            entry={child}
            checklistId={checklistId}
          />
        ))}
      </CollapsibleContent>
    </Collapsible>
  )
}
