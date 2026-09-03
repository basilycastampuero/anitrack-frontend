import { ChevronRight, Folder } from 'lucide-react'
import { cn } from '@/lib/utils'
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
}: ChecklistTreeItemProps) {
  const hasChildren = node.children.length > 0
  const expanded = hasChildren && isExpanded(node.id)
  const selected = node.id === selectedId
  const focused = node.id === focusedId

  return (
    <li
      ref={registerRef(node.id)}
      role="treeitem"
      aria-label={node.name}
      aria-level={level}
      aria-selected={selected}
      aria-expanded={hasChildren ? expanded : undefined}
      tabIndex={focused ? 0 : -1}
      onKeyDown={(e) => onKeyDown(e, node.id)}
      onClick={(e) => {
        e.stopPropagation()
        onSelect(node.id)
      }}
      className="cursor-pointer rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div
        className={cn(
          'flex items-center gap-1.5 rounded-md py-1.5 pr-2 text-sm',
          selected ? 'bg-accent font-medium text-accent-foreground' : 'text-foreground',
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
              className={cn('size-3.5 transition-transform', expanded && 'rotate-90')}
            />
          </button>
        ) : (
          <span className="size-5 shrink-0" aria-hidden />
        )}
        <Folder className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        <span className="min-w-0 flex-1 truncate">{node.name}</span>
        {node.linkCount > 0 && (
          <span className="shrink-0 text-xs text-muted-foreground">{node.linkCount}</span>
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
            />
          ))}
        </ul>
      )}
    </li>
  )
}
