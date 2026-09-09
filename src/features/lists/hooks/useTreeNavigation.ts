import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ChecklistNode } from '@/features/lists/types'

/** Nodo aplanado en orden de aparición visual, con el nivel ARIA (1-based) y su padre. */
interface VisibleTreeNode {
  node: ChecklistNode
  level: number
  parentId: number | null
}

interface UseTreeNavigationArgs {
  tree: ChecklistNode[]
  /** Nodo seleccionado — viene de la URL (`/my-lists/:checklistId`), no vive acá. */
  selectedId: number | null
  onSelect: (id: number) => void
}

/** Camino de ids ancestro→...→padre-directo hasta `targetId`, o `null` si no está en el árbol. */
function findAncestorPath(
  nodes: ChecklistNode[],
  targetId: number,
  path: number[] = [],
): number[] | null {
  for (const node of nodes) {
    if (node.id === targetId) return path
    if (node.children.length > 0) {
      const found = findAncestorPath(node.children, targetId, [...path, node.id])
      if (found) return found
    }
  }
  return null
}

/** Aplana el árbol respetando qué carpetas están expandidas: los hijos de un
 * nodo colapsado no forman parte del recorrido de teclado. */
function flattenVisible(
  nodes: ChecklistNode[],
  expanded: Set<number>,
  level = 1,
  parentId: number | null = null,
): VisibleTreeNode[] {
  const result: VisibleTreeNode[] = []
  for (const node of nodes) {
    result.push({ node, level, parentId })
    if (node.children.length > 0 && expanded.has(node.id)) {
      result.push(...flattenVisible(node.children, expanded, level + 1, node.id))
    }
  }
  return result
}

/**
 * Estado y navegación por teclado de `ChecklistTree` (doc 12 §3.5a, patrón
 * ARIA APG Tree View escrito a mano — mismo criterio que ADR-013).
 *
 * Dos piezas de estado, cada una donde corresponde: la selección vive en la
 * URL y la recibe como prop (`selectedId`/`onSelect`); expandido/colapsado y
 * el foco roving-tabindex son puramente de interacción y viven acá.
 */
export function useTreeNavigation({ tree, selectedId, onSelect }: UseTreeNavigationArgs) {
  const [expanded, setExpanded] = useState<Set<number>>(() => new Set())
  // Foco explícito (roving tabindex). `null` hasta que el usuario interactúa:
  // mientras tanto, el ítem con tabIndex=0 se deriva de `selectedId` más abajo.
  const [explicitFocusId, setExplicitFocusId] = useState<number | null>(null)
  const itemRefs = useRef(new Map<number, HTMLLIElement>())
  const didAutoExpand = useRef(false)

  // Revela el nodo seleccionado por URL expandiendo sus ancestros, una sola
  // vez cuando el árbol llega: si no, un refresh sobre una lista anidada dentro
  // de una carpeta colapsada no muestra la selección en el árbol aunque el
  // panel de entries sí tenga los datos correctos.
  useEffect(() => {
    if (didAutoExpand.current || tree.length === 0 || selectedId == null) return
    didAutoExpand.current = true
    const ancestors = findAncestorPath(tree, selectedId)
    if (ancestors && ancestors.length > 0) {
      setExpanded((prev) => new Set([...prev, ...ancestors]))
    }
  }, [tree, selectedId])

  const visible = useMemo(() => flattenVisible(tree, expanded), [tree, expanded])

  const focusedId = useMemo(() => {
    if (explicitFocusId != null && visible.some((v) => v.node.id === explicitFocusId)) {
      return explicitFocusId
    }
    if (selectedId != null && visible.some((v) => v.node.id === selectedId)) {
      return selectedId
    }
    return visible[0]?.node.id ?? null
  }, [explicitFocusId, selectedId, visible])

  const isExpanded = useCallback((id: number) => expanded.has(id), [expanded])

  const toggleExpand = useCallback((id: number) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const registerItemRef = useCallback(
    (id: number) => (el: HTMLLIElement | null) => {
      if (el) itemRefs.current.set(id, el)
      else itemRefs.current.delete(id)
    },
    [],
  )

  /** Mueve el foco roving-tabindex de verdad: actualiza el estado y llama
   * `.focus()` en el DOM, no solo el atributo — si no, el navegador y el
   * lector de pantalla se quedan en el ítem anterior. */
  const moveFocusTo = useCallback((id: number | null) => {
    if (id == null) return
    setExplicitFocusId(id)
    itemRefs.current.get(id)?.focus()
  }, [])

  /** Selección (click o Enter): sincroniza el foco al nodo elegido además de
   * notificar al caller, para que el roving tabindex no se quede atrás de la URL. */
  const selectNode = useCallback(
    (id: number) => {
      setExplicitFocusId(id)
      onSelect(id)
    },
    [onSelect],
  )

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent, nodeId: number) => {
      // Cada `treeitem` está anidado dentro del `<li>` de su padre (estructura
      // estándar del patrón ARIA Tree), así que un keydown en un nodo hijo
      // burbujea de forma nativa hasta el `onKeyDown` del padre. Sin cortar la
      // propagación acá, una sola tecla dispara el handler del hijo y LUEGO el
      // del padre con su propio nodeId — por ejemplo, ArrowLeft en una hoja
      // subía el foco al padre y de paso lo colapsaba, dos efectos en un solo
      // keypress.
      event.stopPropagation()

      const index = visible.findIndex((v) => v.node.id === nodeId)
      if (index < 0) return
      const current = visible[index]!
      const hasChildren = current.node.children.length > 0

      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault()
          moveFocusTo(visible[index + 1]?.node.id ?? null)
          break
        case 'ArrowUp':
          event.preventDefault()
          moveFocusTo(visible[index - 1]?.node.id ?? null)
          break
        case 'ArrowRight':
          event.preventDefault()
          if (hasChildren) {
            if (!expanded.has(current.node.id)) {
              toggleExpand(current.node.id)
            } else {
              const child = visible[index + 1]
              if (child?.parentId === current.node.id) moveFocusTo(child.node.id)
            }
          }
          break
        case 'ArrowLeft':
          event.preventDefault()
          if (hasChildren && expanded.has(current.node.id)) {
            toggleExpand(current.node.id)
          } else if (current.parentId != null) {
            moveFocusTo(current.parentId)
          }
          break
        case 'Home':
          event.preventDefault()
          moveFocusTo(visible[0]?.node.id ?? null)
          break
        case 'End':
          event.preventDefault()
          moveFocusTo(visible[visible.length - 1]?.node.id ?? null)
          break
        case 'Enter':
          event.preventDefault()
          selectNode(current.node.id)
          break
      }
    },
    [visible, expanded, toggleExpand, moveFocusTo, selectNode],
  )

  return { visible, focusedId, isExpanded, toggleExpand, registerItemRef, selectNode, handleKeyDown }
}
