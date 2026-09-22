import { describe, it, expect, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useTreeNavigation } from '@/features/lists/hooks/useTreeNavigation'
import type { ChecklistNode } from '@/features/lists/types'

function node(overrides: Partial<ChecklistNode>): ChecklistNode {
  return {
    id: 1,
    name: 'Node',
    description: null,
    imageUrl: null,
    order: 0,
    sortingMode: 'C',
    isPublished: false,
    linkCount: 0,
    children: [],
    ...overrides,
  }
}

/** Un `<li>` real, adjunto al documento: `focus()` en jsdom solo mueve
 * `document.activeElement` si el nodo es focusable y está conectado. */
function attachLi(): HTMLLIElement {
  const li = document.createElement('li')
  li.tabIndex = -1
  document.body.appendChild(li)
  return li
}

describe('useTreeNavigation — focusCurrent', () => {
  it('mueve el foco real de DOM al nodo que hoy tiene el roving tabindex', () => {
    const tree = [node({ id: 1, name: 'Watching' }), node({ id: 2, name: 'Completed' })]
    const { result } = renderHook(
      ({ tree }) => useTreeNavigation({ tree, selectedId: null, onSelect: vi.fn() }),
      { initialProps: { tree } },
    )
    const li1 = attachLi()
    const li2 = attachLi()
    try {
      result.current.registerItemRef(1)(li1)
      result.current.registerItemRef(2)(li2)

      // Sin interacción todavía, el roving tabindex arranca en el primer nodo
      // visible ("Watching", id 1).
      expect(result.current.focusedId).toBe(1)
      act(() => result.current.focusCurrent())
      expect(document.activeElement).toBe(li1)
    } finally {
      li1.remove()
      li2.remove()
    }
  })

  it('tras desregistrar el nodo con foco (se borró), sigue al vecino que lo reemplaza', () => {
    const tree = [node({ id: 1, name: 'Watching' }), node({ id: 2, name: 'Completed' })]
    const { result, rerender } = renderHook(
      ({ tree }) => useTreeNavigation({ tree, selectedId: null, onSelect: vi.fn() }),
      { initialProps: { tree } },
    )
    const li1 = attachLi()
    const li2 = attachLi()
    try {
      result.current.registerItemRef(1)(li1)
      result.current.registerItemRef(2)(li2)

      // "Watching" (1) se borra: su `<li>` se desregistra (como hace el `ref`
      // callback de `ChecklistTreeItem` al desmontar) y el árbol llega sin él.
      result.current.registerItemRef(1)(null)
      rerender({ tree: [node({ id: 2, name: 'Completed' })] })

      // El roving tabindex cayó al único nodo que queda.
      expect(result.current.focusedId).toBe(2)

      // Sin esto (`focusCurrent` no existía antes del fix), el `<li>` que
      // tenía el foco real de DOM ya no está conectado y el navegador lo deja
      // en el `<body>`: `focusCurrent` es lo que lo recupera.
      act(() => result.current.focusCurrent())
      expect(document.activeElement).toBe(li2)
    } finally {
      li1.remove()
      li2.remove()
    }
  })

  it('no revienta si no hay ningún nodo con foco (árbol vacío)', () => {
    const { result } = renderHook(() =>
      useTreeNavigation({ tree: [], selectedId: null, onSelect: vi.fn() }),
    )

    expect(result.current.focusedId).toBeNull()
    expect(() => act(() => result.current.focusCurrent())).not.toThrow()
  })
})

/**
 * Regresión del fix a `autoExpandedFor` (antes `didAutoExpand`, un booleano
 * de "una sola vez en la vida"): revela los ancestros de la selección actual
 * por URL, cada vez que la selección cambia — no solo la primera vez que el
 * árbol llega con contenido.
 *
 * Árbol de 4 niveles calcado del branch del seed usado en otros tests de esta
 * feature (`Favorites` (3) > `All-time` (4) > `By decade` (5) > `2010s` (6)),
 * más una raíz sin ancestros (1) para reproducir el caso que rompía el
 * booleano viejo.
 */
describe('useTreeNavigation — auto-expand de ancestros por selección', () => {
  const leaf = node({ id: 6, name: '2010s' })
  const byDecade = node({ id: 5, name: 'By decade', children: [leaf] })
  const allTime = node({ id: 4, name: 'All-time', children: [byDecade] })
  const favorites = node({ id: 3, name: 'Favorites', children: [allTime] })
  const watching = node({ id: 1, name: 'Watching' })
  const tree = [watching, favorites]

  it('expande los ancestros de una selección posterior aunque el primer montaje no tuviera ninguno', () => {
    const { result, rerender } = renderHook(
      ({ selectedId }: { selectedId: number | null }) =>
        useTreeNavigation({ tree, selectedId, onSelect: vi.fn() }),
      { initialProps: { selectedId: 1 } },
    )
    // "Watching" (1) es raíz: no hay ancestros que expandir. El booleano viejo
    // igual marcaba "ya expandí" acá, dejando la lógica muerta para siempre.
    expect(result.current.isExpanded(3)).toBe(false)

    rerender({ selectedId: 6 })

    expect(result.current.isExpanded(3)).toBe(true)
    expect(result.current.isExpanded(4)).toBe(true)
    expect(result.current.isExpanded(5)).toBe(true)
  })

  it('no vuelve a expandir un ancestro que el usuario acaba de colapsar a mano, si la selección no cambió', () => {
    const { result, rerender } = renderHook(
      ({ selectedId }: { selectedId: number | null }) =>
        useTreeNavigation({ tree, selectedId, onSelect: vi.fn() }),
      { initialProps: { selectedId: 6 } },
    )
    expect(result.current.isExpanded(5)).toBe(true)

    act(() => result.current.toggleExpand(5))
    expect(result.current.isExpanded(5)).toBe(false)

    // Mismo `selectedId`: un re-render (p. ej. por otro cambio de estado) no
    // tiene que pelearse con el colapso manual.
    rerender({ selectedId: 6 })
    expect(result.current.isExpanded(5)).toBe(false)
  })
})
