import { EmptyState } from '@/components/common/EmptyState'
import { ErrorState } from '@/components/common/ErrorState'
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton'
import { FranchiseEntryGroup } from '@/features/lists/components/FranchiseEntryGroup'
import { ListEntryRow } from '@/features/lists/components/ListEntryRow'
import { useChecklistEntries } from '@/features/lists/hooks/useChecklistEntries'
import { isVersionEntry } from '@/features/lists/types'
import { cn } from '@/lib/utils'
import { t } from '@/i18n/en'

interface ChecklistEntriesProps {
  /** Carpeta seleccionada del árbol (`null` = ninguna todavía) — mismo
   * criterio que `useChecklistEntries`: la URL manda, el caller la deriva. */
  checklistId: number | null
  className?: string
}

/**
 * Panel derecho de "Mis listas" (doc 06/12 §3.6), en modo lectura: contenido
 * de la carpeta seleccionada. Reemplaza el `EntriesPanel` provisorio de
 * 3.5a (solo `<li>` con `displayName`) — ahora despacha cada entry a
 * `ListEntryRow` (version-link suelto) o `FranchiseEntryGroup`
 * (franchise-link con hijos) según `entry.kind`.
 *
 * Es un componente de feature, no vive inline en `MyListsPage`, por la
 * misma razón que `ChecklistTree`: la página solo ensambla (regla del
 * proyecto), y este panel es dueño de su propia query y de sus 4 estados
 * (loading/empty/error/data), igual que su vecino de la izquierda.
 */
export function ChecklistEntries({ checklistId, className }: ChecklistEntriesProps) {
  const entries = useChecklistEntries(checklistId)

  if (checklistId == null) {
    return (
      <EmptyState
        className={className}
        title={t.lists.selectPromptTitle}
        description={t.lists.selectPromptBody}
      />
    )
  }

  if (entries.isPending) {
    return <LoadingSkeleton className={className} variant="list-rows" count={4} />
  }

  if (entries.isError) {
    return <ErrorState className={className} onRetry={() => entries.refetch()} />
  }

  if (entries.data.length === 0) {
    return (
      <EmptyState
        className={className}
        title={t.lists.entriesEmptyTitle}
        description={t.lists.entriesEmptyBody}
      />
    )
  }

  return (
    <ul className={cn('space-y-2', className)}>
      {entries.data.map((entry) => (
        <li key={entry.linkId}>
          {isVersionEntry(entry) ? (
            <ListEntryRow entry={entry} />
          ) : (
            <FranchiseEntryGroup entry={entry} />
          )}
        </li>
      ))}
    </ul>
  )
}
