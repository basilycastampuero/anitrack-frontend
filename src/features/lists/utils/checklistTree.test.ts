import { describe, it, expect } from 'vitest'
import {
  countDescendants,
  patchChecklistNode,
} from '@/features/lists/utils/checklistTree'
import type {
  ChecklistNode,
  CosmeticChecklistPatch,
} from '@/features/lists/types'

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

/**
 * CA de la tarea 3.13 (deuda #6): el camino optimista tiene que rechazar los
 * campos estructurales **en tiempo de compilación**, no por convención.
 *
 * Los `@ts-expect-error` son la aserción: si algún día `CosmeticChecklistPatch`
 * volviera a aceptar `parentId`/`order`, el comentario pasa a ser un error en
 * sí mismo y `npm run typecheck` falla. El test en runtime no prueba nada —
 * lo que se verifica acá lo verifica `tsc`.
 */
describe('CosmeticChecklistPatch cierra el camino optimista', () => {
  it('no acepta parentId ni order', () => {
    // @ts-expect-error mover una carpeta es estructural: `patchChecklistNode`
    // no lo hace, y el hook estructural es la tarea 4.10.
    const move: CosmeticChecklistPatch = { parentId: 3 }
    // @ts-expect-error reordenar hermanos es estructural por el mismo motivo.
    const reorder: CosmeticChecklistPatch = { order: 1 }

    expect([move, reorder]).toHaveLength(2)
  })

  it('sí acepta los cuatro campos cosméticos', () => {
    const patch: CosmeticChecklistPatch = {
      name: 'Renamed',
      description: null,
      isPublished: true,
      sortingMode: 'N',
    }
    expect(patchChecklistNode([node({ id: 1 })], 1, patch)[0]?.name).toBe(
      'Renamed',
    )
  })

  it('patchChecklistNode tampoco los acepta', () => {
    // @ts-expect-error la función no mueve nada; aceptarlo sería prometerlo.
    expect(() => patchChecklistNode([], 1, { parentId: 2 })).not.toThrow()
  })
})
