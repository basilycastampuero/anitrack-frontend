import type { ChecklistNode, UpdateChecklistRequest } from '@/features/lists/types'

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
 */
export function patchChecklistNode(
  tree: ChecklistNode[],
  id: number,
  patch: UpdateChecklistRequest,
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
