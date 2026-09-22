import type {
  ChecklistNode,
  CosmeticChecklistPatch,
} from '@/features/lists/types'

/** Cuánto se lleva puesto borrar `node` (doc 12 §3.5b): sus sub-carpetas
 * descendientes (sin contarse a sí mismo) y el total de entries — el propio
 * `linkCount` del nodo más el de cada descendiente. `linkCount` ya viene
 * acotado a los links propios de cada nodo (doc 04: excluye los hijos de un
 * franchise-link), así que sumarlo recursivamente no cuenta nada dos veces.
 * Pura y testeada aparte: el diálogo de borrado la usa para no ser un
 * "¿seguro?" genérico. */
export function countDescendants(node: ChecklistNode): {
  listCount: number
  entryCount: number
} {
  return node.children.reduce(
    (acc, child) => {
      const sub = countDescendants(child)
      // `sub.entryCount` ya arranca en `child.linkCount` (es la base del
      // acumulador de `countDescendants(child)`), así que sumarlo de nuevo
      // acá contaría los links de `child` dos veces.
      return {
        listCount: acc.listCount + 1 + sub.listCount,
        entryCount: acc.entryCount + sub.entryCount,
      }
    },
    { listCount: 0, entryCount: node.linkCount },
  )
}

/**
 * Aplica un patch parcial al nodo `id` en cualquier nivel del árbol, sin
 * mutar el original (doc 12 §5, 3.4: `useUpdateChecklist` optimistic
 * "escribe el nodo nuevo recorriendo el árbol"). Solo los ancestros del nodo
 * afectado obtienen una referencia nueva — el resto del árbol se preserva tal
 * cual, así TanStack Query no re-renderiza ramas que no cambiaron.
 *
 * Si `id` no aparece en el árbol, devuelve el árbol de entrada sin tocar
 * (no debería pasar en uso normal: el nodo tiene que existir en cache para
 * que la UI lo esté editando).
 *
 * El patch es `CosmeticChecklistPatch` y no el request completo a propósito
 * (deuda #6): esta función NO mueve ni reordena nada, así que aceptar
 * `parentId`/`order` sería prometer algo que no cumple.
 */
export function patchChecklistNode(
  tree: ChecklistNode[],
  id: number,
  patch: CosmeticChecklistPatch,
): ChecklistNode[] {
  let changed = false

  const result = tree.map((node) => {
    if (node.id === id) {
      changed = true
      return { ...node, ...patch }
    }
    if (node.children.length === 0) return node
    const children = patchChecklistNode(node.children, id, patch)
    if (children === node.children) return node
    changed = true
    return { ...node, children }
  })

  // Devolver la MISMA referencia de entrada cuando nada cambió en esta rama
  // (en vez del array nuevo que `.map` siempre asigna) es lo que le da
  // structural sharing al árbol completo: solo el camino hacia el nodo
  // editado obtiene identidades nuevas, el resto queda intacto.
  return changed ? result : tree
}

/**
 * Busca un nodo por id en todo el árbol, no solo en el nivel superior.
 *
 * Vive acá y no inline en cada caller porque ya se había escrito tres veces a
 * mano (en dos tests y en el mock). El árbol es recursivo: buscar solo en las
 * raíces deja fuera cualquier carpeta anidada, que es el 80% del árbol del
 * seed.
 */
export function findChecklistNode(
  tree: ChecklistNode[],
  id: number,
): ChecklistNode | null {
  for (const node of tree) {
    if (node.id === id) return node
    const found = findChecklistNode(node.children, id)
    if (found) return found
  }
  return null
}
