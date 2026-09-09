import { describe, it, expect } from 'vitest'
import { countDescendants } from '@/features/lists/utils/checklistTree'
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

describe('countDescendants', () => {
  it('un nodo sin hijos solo cuenta sus propios entries, sin sub-listas', () => {
    expect(countDescendants(node({ linkCount: 3, children: [] }))).toEqual({
      listCount: 0,
      entryCount: 3,
    })
  })

  it('una carpeta vacía sin hijos ni entries devuelve todo en cero', () => {
    expect(countDescendants(node({ linkCount: 0, children: [] }))).toEqual({
      listCount: 0,
      entryCount: 0,
    })
  })

  it('suma entries propios más los de cada hijo directo', () => {
    const tree = node({
      linkCount: 2,
      children: [node({ id: 2, linkCount: 5 }), node({ id: 3, linkCount: 1 })],
    })
    expect(countDescendants(tree)).toEqual({ listCount: 2, entryCount: 8 })
  })

  it('cuenta sub-listas y entries a través de varios niveles anidados, sin duplicar', () => {
    // A (linkCount 1)
    //  └─ B (linkCount 2)
    //      └─ C (linkCount 4)
    const tree = node({
      id: 1,
      linkCount: 1,
      children: [
        node({
          id: 2,
          linkCount: 2,
          children: [node({ id: 3, linkCount: 4 })],
        }),
      ],
    })
    // sub-listas: B y C (2). Entries: 1 (A) + 2 (B) + 4 (C) = 7 — el propio
    // nodo A NO cuenta como "sub-lista" de sí mismo, pero sus entries sí van.
    expect(countDescendants(tree)).toEqual({ listCount: 2, entryCount: 7 })
  })
})
