import { cn } from '@/lib/utils'
import { ChecklistNodeMenu } from '@/features/lists/components/ChecklistNodeMenu'
import type { ChecklistNode } from '@/features/lists/types'

interface ChecklistNodeActionsProps {
  node: ChecklistNode
  open: boolean
  onOpenChange: (open: boolean) => void
  onClosed: () => void
}

/**
 * Celda de acciones de un nodo del árbol: envuelve `ChecklistNodeMenu` con el
 * estilo hover-reveal y el corte de burbujeo de teclado hacia el árbol (doc
 * 12 §3.5b, riesgo #2). Separado de `ChecklistTreeItem` solo para no cruzar
 * el techo de ~150 líneas por componente — sin lógica propia más allá de eso,
 * el estado del menú (`open`) sigue viviendo en `ChecklistTreeItem`, que es
 * quien necesita abrirlo también desde el atajo de teclado Shift+F10.
 */
export function ChecklistNodeActions({ node, open, onOpenChange, onClosed }: ChecklistNodeActionsProps) {
  return (
    <span
      className={cn(
        'shrink-0 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100',
        open && 'opacity-100',
      )}
      // React hace bubbling de eventos sintéticos siguiendo el árbol de
      // COMPONENTES, no el DOM: el menú y sus tres dialogs viven en un Portal
      // (fuera del `<li>` en el DOM real), pero siguen siendo descendientes
      // React de este `<span>` — sin este corte, una flecha o Enter tipeados
      // en el input de "Rename", o la navegación interna del dropdown,
      // burbujearían hasta el `onKeyDown` del árbol y moverían la
      // selección/foco del nodo (confirmado con un test que lo reproducía
      // antes de este fix).
      onKeyDown={(e) => e.stopPropagation()}
    >
      <ChecklistNodeMenu node={node} open={open} onOpenChange={onOpenChange} onClosed={onClosed} />
    </span>
  )
}
