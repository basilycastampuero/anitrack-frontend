import { useState, type ReactNode } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ErrorState } from '@/components/common/ErrorState'
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton'
import { ChecklistFormDialog } from '@/features/lists/components/ChecklistFormDialog'
import { ChecklistTreeItem } from '@/features/lists/components/ChecklistTreeItem'
import { StarterListsPrompt } from '@/features/lists/components/StarterListsPrompt'
import { useChecklists } from '@/features/lists/hooks/useChecklists'
import { useCreateChecklist } from '@/features/lists/hooks/useCreateChecklist'
import { useTreeNavigation } from '@/features/lists/hooks/useTreeNavigation'
import { t } from '@/i18n/en'

interface ChecklistTreeProps {
  /** Nodo seleccionado — la URL manda (`/my-lists/:checklistId`), el caller
   * decide cómo la lee (`null` = nada seleccionado todavía). */
  selectedId: number | null
  onSelect: (id: number) => void
  /**
   * Modo selección (lo usa el `LinkWizard`): sin cabecera, sin botón de crear
   * y sin menú por nodo. El árbol es el mismo —no se duplica— pero adentro de
   * un diálogo esas tres cosas son ruido, y el dialog de crear anidado en otro
   * dialog pelea por el foco.
   */
  compact?: boolean
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
export function ChecklistTree({
  selectedId,
  onSelect,
  compact = false,
  className,
}: ChecklistTreeProps) {
  const checklists = useChecklists()
  const tree = checklists.data ?? []
  const nav = useTreeNavigation({ tree, selectedId, onSelect })
  // Crear una carpeta raíz (doc 07, CA 3.5b: "crear, raíz y sub") no tiene un
  // nodo de origen desde el que abrir `ChecklistNodeMenu` — vive acá, en el
  // único lugar que ve el árbol completo en vez de un nodo puntual.
  const createChecklist = useCreateChecklist()
  const [createOpen, setCreateOpen] = useState(false)

  let body: ReactNode
  if (checklists.isPending) {
    body = <LoadingSkeleton variant="tree" />
  } else if (checklists.isError) {
    body = <ErrorState onRetry={() => checklists.refetch()} />
  } else if (tree.length === 0) {
    // Onboarding (doc 12 §3.5c, ADR-003): un usuario sin ninguna checklist ve
    // el CTA de starter lists en vez del EmptyState genérico.
    body = <StarterListsPrompt />
  } else {
    body = (
      <ul role="tree" aria-label={t.lists.treeLabel} className="space-y-0.5">
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
            onFocusLost={nav.focusCurrent}
            compact={compact}
          />
        ))}
      </ul>
    )
  }

  if (compact) return <div className={className}>{body}</div>

  return (
    <div className={className}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-muted-foreground">
          {t.lists.treeLabel}
        </h2>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={t.lists.newList}
          onClick={() => setCreateOpen(true)}
        >
          <Plus className="size-4" aria-hidden />
        </Button>
      </div>
      {body}
      <ChecklistFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        mode="create"
        onSubmit={(values) => createChecklist.mutateAsync(values)}
      />
    </div>
  )
}
