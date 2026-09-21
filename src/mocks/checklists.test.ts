import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest'
import { server } from '@/mocks/server'
import { listsService } from '@/features/lists/services/lists.service'
import { ApiError } from '@/types/api.types'
import type { ChecklistNode } from '@/features/lists/types'

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

/**
 * Deuda #6 (doc 15 §4.1). El `PATCH` del mock aceptaba `parentId`/`order`, los
 * pegaba como campos sueltos sobre el nodo y no movía nada. El backend real sí
 * los implementa, así que el mock tenía que aprender a hacerlo —no a
 * rechazarlos, que habría inventado una divergencia.
 *
 * Árbol del usuario 1 en el seed: Watching (1), Completed (2) y Favorites (3),
 * esta última con All-time (4) > By decade (5) > 2010s (6).
 */
function find(nodes: ChecklistNode[], id: number): ChecklistNode | null {
  for (const node of nodes) {
    if (node.id === id) return node
    const found = find(node.children, id)
    if (found) return found
  }
  return null
}

describe('PATCH /me/checklists/:id — mover y reordenar', () => {
  it('mueve un nodo a otro padre y el árbol lo devuelve en su lugar nuevo', async () => {
    await listsService.updateChecklist(1, { parentId: 3 })

    const tree = await listsService.getChecklists()
    expect(tree.map((node) => node.id)).not.toContain(1)
    const favorites = find(tree, 3)
    expect(favorites?.children.map((child) => child.id)).toContain(1)
  })

  it('mueve a un nodo anidado, no solo a una raíz', async () => {
    // "Completed" (2) baja cuatro niveles, hasta "2010s" (6).
    await listsService.updateChecklist(2, { parentId: 6 })

    const tree = await listsService.getChecklists()
    expect(find(tree, 6)?.children.map((child) => child.id)).toEqual([2])
  })

  it('reordena hermanos renumerando a todos, sin huecos ni repetidos', async () => {
    await listsService.updateChecklist(3, { order: 0 })

    const tree = await listsService.getChecklists()
    expect(tree.map((node) => node.id)).toEqual([3, 1, 2])
    expect(tree.map((node) => node.order)).toEqual([0, 1, 2])
  })

  it('un order más grande que la cantidad de hermanos lo deja último', async () => {
    await listsService.updateChecklist(1, { order: 99 })

    const tree = await listsService.getChecklists()
    expect(tree.map((node) => node.id)).toEqual([2, 3, 1])
  })

  it('mover una carpeta dentro de su propia descendencia da VALIDATION', async () => {
    // "Favorites" (3) dentro de "All-time" (4), que es su hija: dejaría un
    // ciclo y el recorrido del árbol en un loop infinito.
    const error = await listsService
      .updateChecklist(3, { parentId: 4 })
      .catch((caught: unknown) => caught)

    expect(error).toBeInstanceOf(ApiError)
    expect((error as ApiError).code).toBe('VALIDATION')
    expect((error as ApiError).field).toBe('parentId')

    // Y el árbol quedó intacto: el rechazo no movió nada a medias.
    const tree = await listsService.getChecklists()
    expect(find(tree, 3)?.children.map((child) => child.id)).toEqual([4])
  })

  it('un parentId inexistente da NOT_FOUND', async () => {
    const error = await listsService
      .updateChecklist(1, { parentId: 9999 })
      .catch((caught: unknown) => caught)

    expect((error as ApiError).code).toBe('NOT_FOUND')
  })

  it('un patch cosmético no toca la estructura', async () => {
    await listsService.updateChecklist(3, { name: 'Renamed' })

    const tree = await listsService.getChecklists()
    expect(tree.map((node) => node.id)).toEqual([1, 2, 3])
    expect(find(tree, 3)?.name).toBe('Renamed')
    expect(find(tree, 3)?.children.map((child) => child.id)).toEqual([4])
  })
})
