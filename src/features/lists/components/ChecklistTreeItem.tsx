import { useRef, useState } from 'react'
import { ChevronRight, Folder } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ChecklistNodeActions } from '@/features/lists/components/ChecklistNodeActions'
import type { ChecklistNode } from '@/features/lists/types'

interface ChecklistTreeItemProps {
  node: ChecklistNode
  level: number
  selectedId: number | null
  focusedId: number | null
  isExpanded: (id: number) => boolean
  registerRef: (id: number) => (el: HTMLLIElement | null) => void
  onToggleExpand: (id: number) => void
  onSelect: (id: number) => void
  onKeyDown: (event: React.KeyboardEvent<HTMLLIElement>, id: number) => void
  /**
   * Se llama cuando un diálogo se cierra y el `<li>` de origen ya no está en
   * el DOM — pasa al borrar la propia carpeta. Sin esto el foco se queda en el
   * `<body>` y quien navega por teclado pierde su lugar en el árbol.
   */
  onFocusLost: () => void
  /** Sin menú de acciones: el nodo solo se selecciona (ver `ChecklistTree`). */
  compact?: boolean
}

/**
 * Un nodo del árbol (doc 12 §3.5a), recursivo: si tiene hijos y está
 * expandido, se renderiza a sí mismo dentro de un `role="group"` anidado —
 * estructura estándar del patrón ARIA APG Tree View.
 *
 * `aria-label={node.name}` explícito: sin esto, el nombre accesible del
 * `treeitem` incluiría el texto de todos sus descendientes (viven dentro del
 * mismo `<li>`), lo cual es ruido para el lector de pantalla en una carpeta
 * con muchos hijos.
 */
export function ChecklistTreeItem({
  node,
  level,
  selectedId,
  focusedId,
  isExpanded,
  registerRef,
  onToggleExpand,
  onSelect,
  onKeyDown,
  onFocusLost,
  compact = false,
}: ChecklistTreeItemProps) {
  const hasChildren = node.children.length > 0
  const expanded = hasChildren && isExpanded(node.id)
  const selected = node.id === selectedId
  const focused = node.id === focusedId

  // Ref propia además de `registerRef` (que alimenta el mapa de roving
  // tabindex de `useTreeNavigation`): el menú contextual necesita devolver el
  // foco de DOM a ESTE `<li>` puntual al cerrarse, y ese mapa vive fuera del
  // componente — más simple tener la referencia acá que ir a buscarla.
  const liRef = useRef<HTMLLIElement | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <li
      ref={(el) => {
        liRef.current = el
        registerRef(node.id)(el)
      }}
      role="treeitem"
      aria-label={node.name}
      aria-level={level}
      aria-selected={selected}
      aria-expanded={hasChildren ? expanded : undefined}
      tabIndex={focused ? 0 : -1}
      onKeyDown={(e) => {
        // Patrón ARIA APG "Actions in treeitems": Shift+F10 y la tecla Menú
        // abren el menú contextual del nodo con foco, sin robarle la tecla a
        // la navegación del árbol (doc 12 §3.5b, riesgo #2) — por eso el
        // corte pasa ACÁ, antes de delegar a `onKeyDown` (que además tiene su
        // propio `stopPropagation` para el bug de burbujeo entre niveles).
        if (
          !compact &&
          (e.key === 'ContextMenu' || (e.shiftKey && e.key === 'F10'))
        ) {
          e.preventDefault()
          e.stopPropagation()
          setMenuOpen(true)
          return
        }
        onKeyDown(e, node.id)
      }}
      onClick={(e) => {
        e.stopPropagation()
        onSelect(node.id)
      }}
      className="cursor-pointer rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div
        className={cn(
          'group flex items-center gap-1.5 rounded-md py-1.5 pr-2 text-sm',
          selected
            ? 'bg-accent font-medium text-accent-foreground'
            : 'text-foreground',
        )}
        style={{ paddingLeft: `${(level - 1) * 16 + 4}px` }}
      >
        {hasChildren ? (
          <button
            type="button"
            tabIndex={-1}
            aria-hidden
            onClick={(e) => {
              e.stopPropagation()
              onToggleExpand(node.id)
            }}
            className="flex size-5 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-muted"
          >
            <ChevronRight
              className={cn(
                'size-3.5 transition-transform',
                expanded && 'rotate-90',
              )}
            />
          </button>
        ) : (
          <span className="size-5 shrink-0" aria-hidden />
        )}
        <Folder className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        <span className="min-w-0 flex-1 truncate">{node.name}</span>
        {node.linkCount > 0 && (
          <span className="shrink-0 text-xs text-muted-foreground">
            {node.linkCount}
          </span>
        )}
        {!compact && (
          <ChecklistNodeActions
            node={node}
            open={menuOpen}
            onOpenChange={setMenuOpen}
            // Camino rápido para cuando el refetch YA sacó el nodo antes de
            // que cerrara el diálogo. No es el caso habitual —lo normal es que
            // el diálogo cierre primero y el nodo siga montado acá—, así que
            // la recuperación de verdad la hace el efecto de
            // `useTreeNavigation`, atado al cambio de datos. Esto solo evita
            // un parpadeo cuando el orden se da al revés.
            onClosed={() => {
              const item = liRef.current
              if (item?.isConnected) item.focus()
              else onFocusLost()
            }}
          />
        )}
      </div>

      {hasChildren && expanded && (
        <ul role="group">
          {node.children.map((child) => (
            <ChecklistTreeItem
              key={child.id}
              node={child}
              level={level + 1}
              selectedId={selectedId}
              focusedId={focusedId}
              isExpanded={isExpanded}
              registerRef={registerRef}
              onToggleExpand={onToggleExpand}
              onSelect={onSelect}
              onKeyDown={onKeyDown}
              onFocusLost={onFocusLost}
              compact={compact}
            />
          ))}
        </ul>
      )}
    </li>
  )
}
