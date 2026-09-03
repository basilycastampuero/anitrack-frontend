import { EmptyState } from '@/components/common/EmptyState'
import { ErrorState } from '@/components/common/ErrorState'
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton'
import { ChecklistTreeItem } from '@/features/lists/components/ChecklistTreeItem'
import { useChecklists } from '@/features/lists/hooks/useChecklists'
import { useTreeNavigation } from '@/features/lists/hooks/useTreeNavigation'
import { cn } from '@/lib/utils'
import { t } from '@/i18n/en'

interface ChecklistTreeProps {
  /** Nodo seleccionado — la URL manda (`/my-lists/:checklistId`), el caller
   * decide cómo la lee (`null` = nada seleccionado todavía). */
  selectedId: number | null
  onSelect: (id: number) => void
  className?: string
}

/**
 * Árbol de carpetas del usuario, solo lectura (doc 12 §3.5a). Patrón ARIA
 * `tree` escrito a mano (ADR-013): `role="tree"` + `treeitem` con
 * `aria-expanded`/`aria-selected`/`aria-level`, roving tabindex y navegación
 * completa por teclado — toda la lógica de interacción vive en
 * `useTreeNavigation`, este componente solo arma el árbol y cablea los
 * cuatro estados de datos.
 */
export function ChecklistTree({ selectedId, onSelect, className }: ChecklistTreeProps) {
  const checklists = useChecklists()
  const tree = checklists.data ?? []
  const nav = useTreeNavigation({ tree, selectedId, onSelect })

  if (checklists.isPending) {
    return <LoadingSkeleton variant="tree" className={className} />
  }

  if (checklists.isError) {
    return <ErrorState onRetry={() => checklists.refetch()} className={className} />
  }

  if (tree.length === 0) {
    return (
      <EmptyState
        title={t.lists.treeEmptyTitle}
        description={t.lists.treeEmptyBody}
        className={className}
      />
    )
  }

  return (
    <ul role="tree" aria-label={t.lists.treeLabel} className={cn('space-y-0.5', className)}>
      {tree.map((node) => (
        <ChecklistTreeItem
          key={node.id}
          node={node}
          level={1}
          selectedId={selectedId}
          focusedId={nav.focusedId}
          isExpanded={nav.isExpanded}
          registerRef={nav.registerItemRef}
          onToggleExpand={nav.toggleExpand}
          onSelect={nav.selectNode}
          onKeyDown={nav.handleKeyDown}
        />
      ))}
    </ul>
  )
}
