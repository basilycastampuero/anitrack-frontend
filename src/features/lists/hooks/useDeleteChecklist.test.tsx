import { describe, it, expect, beforeAll, beforeEach, afterEach, afterAll } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { server } from '@/mocks/server'
import { useDeleteChecklist } from '@/features/lists/hooks/useDeleteChecklist'
import { useChecklists } from '@/features/lists/hooks/useChecklists'
import { listKeys } from '@/features/lists/hooks/queryKeys'
import { listsService } from '@/features/lists/services/lists.service'
import { useSessionStore } from '@/store/sessionStore'
import type { UserSession } from '@/features/auth/types'

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

const fakeUser: UserSession = {
  id: 1,
  odooUserId: 11,
  name: 'Alex Rivera',
  email: 'alex@example.com',
  avatarUrl: null,
}

beforeEach(() => {
  useSessionStore.setState({ user: fakeUser, status: 'authenticated' })
})

function wrapper(client: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>
  }
}

/** Recorre el árbol buscando un id, sin asumir que está en la raíz. */
function treeContains(
  tree: { id: number; children: unknown[] }[] | undefined,
  id: number,
): boolean {
  if (!tree) return false
  return tree.some(
    (node) =>
      node.id === id ||
      treeContains(node.children as typeof tree, id),
  )
}

describe('useDeleteChecklist', () => {
  // id 4 ("All-time") vive anidado bajo "Favorites" (id 3) en el seed
  // (src/mocks/seed/lists.ts) — prueba que el borrado recorre el árbol, no
  // solo el nivel superior.
  it('borra un nodo anidado e invalida tree() y entries(id)', async () => {
    const client = new QueryClient()
    client.setQueryData(listKeys.entries(4), [{ linkId: 5005 }])

    const { result } = renderHook(
      () => ({ tree: useChecklists(), del: useDeleteChecklist() }),
      { wrapper: wrapper(client) },
    )

    await waitFor(() => expect(result.current.tree.isSuccess).toBe(true))
    expect(treeContains(result.current.tree.data, 4)).toBe(true)

    result.current.del.mutate(4)
    await waitFor(() => expect(result.current.del.isSuccess).toBe(true))

    await waitFor(() => {
      expect(treeContains(result.current.tree.data, 4)).toBe(false)
    })
    expect(client.getQueryState(listKeys.entries(4))?.isInvalidated).toBe(true)
  })

  it('con un id inexistente rechaza con NOT_FOUND', async () => {
    const client = new QueryClient()
    const { result } = renderHook(() => useDeleteChecklist(), {
      wrapper: wrapper(client),
    })

    result.current.mutate(999_999)

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error).toMatchObject({ code: 'NOT_FOUND' })
  })

  // #5 de la revisión: borrar una carpeta cascadea sub-carpetas y links del
  // lado del backend. El hook invalidaba solo tree() + entries(id borrado),
  // dejando stale libraryIndex() (el índice de "ya está en tu lista" que
  // pinta el badge en el catálogo) y los entries() de cualquier sub-carpeta.
  //
  // Los tres tests de #5 usan directamente los ids fijos del seed (2/3/4,
  // mocks/seed/lists.ts) en vez de crear sus propias carpetas: con
  // `resetMockDb()` (deuda #7, bitácora 13) cada test arranca contra el seed
  // original sin importar qué borró el primer test de este archivo, así que
  // depender de esos ids ya no ata el resultado al orden de ejecución.
  it('invalida libraryIndex() además de tree() y entries()', async () => {
    const client = new QueryClient()
    client.setQueryData(listKeys.libraryIndex(), { versionIds: [1005], franchiseIds: [] })

    const { result } = renderHook(() => useDeleteChecklist(), { wrapper: wrapper(client) })

    // id 2 ("Completed") es una carpeta raíz del seed sin sub-carpetas.
    result.current.mutate(2)
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(client.getQueryState(listKeys.libraryIndex())?.isInvalidated).toBe(true)
  })

  it('cascada: borrar una carpeta con sub-carpetas también invalida los entries() de esas sub-carpetas', async () => {
    const client = new QueryClient()
    client.setQueryData(listKeys.entries(4), [{ linkId: 99999 }])

    const { result } = renderHook(() => useDeleteChecklist(), { wrapper: wrapper(client) })

    // "Favorites" (3) tiene a "All-time" (4) como sub-carpeta directa, seed.
    result.current.mutate(3)
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(client.getQueryState(listKeys.entries(4))?.isInvalidated).toBe(true)
  })

  it('el mock también cascadea al borrar: los entries de una sub-carpeta borrada quedan huérfanos si no se limpian', async () => {
    // Reproduce el hallazgo del revisor sobre `handlers.ts`: `removeChecklistNode`
    // borra el nodo del árbol, pero `delete entriesByChecklist[id]` solo limpia
    // el nivel borrado, no sus descendientes. Sin este fix, entries(4) seguiría
    // devolviendo el link huérfano después de borrar "Favorites" (3).
    // "All-time" (4) ya tiene su propio entry en el seed (mocks/seed/lists.ts),
    // así que no hace falta fabricar uno a mano.
    await listsService.deleteChecklist(3)

    const entries = await listsService.getEntries(4)
    expect(entries).toEqual([])
  })
})
