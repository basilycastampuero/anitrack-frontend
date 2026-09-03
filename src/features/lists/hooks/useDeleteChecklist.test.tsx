import { describe, it, expect, beforeAll, beforeEach, afterEach, afterAll } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { server } from '@/mocks/server'
import { useDeleteChecklist } from '@/features/lists/hooks/useDeleteChecklist'
import { useChecklists } from '@/features/lists/hooks/useChecklists'
import { listKeys } from '@/features/lists/hooks/queryKeys'
import { listsService } from '@/features/lists/services/lists.service'
import { entriesByChecklist } from '@/mocks/seed/lists'
import { useSessionStore } from '@/store/sessionStore'
import type { UserSession } from '@/features/auth/types'
import type { ListEntry } from '@/features/lists/types'

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
  // Los tres tests de #5 crean sus propias carpetas en vez de reutilizar los
  // ids fijos del seed (3/4): el seed es un objeto mutable compartido a nivel
  // de módulo sin reset entre tests (hallazgo #7, fuera de alcance acá), y el
  // primer test de este archivo ya borra el id 4 — depender de esos ids
  // haría que el resultado dependiera del orden de ejecución.
  it('invalida libraryIndex() además de tree() y entries()', async () => {
    const client = new QueryClient()
    const created = await listsService.createChecklist({ name: 'Temp #5 libraryIndex' })
    client.setQueryData(listKeys.libraryIndex(), { versionIds: [1005], franchiseIds: [] })

    const { result } = renderHook(() => useDeleteChecklist(), { wrapper: wrapper(client) })

    result.current.mutate(created.id)
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(client.getQueryState(listKeys.libraryIndex())?.isInvalidated).toBe(true)
  })

  it('cascada: borrar una carpeta con sub-carpetas también invalida los entries() de esas sub-carpetas', async () => {
    const client = new QueryClient()
    const parent = await listsService.createChecklist({ name: 'Temp #5 parent' })
    const child = await listsService.createChecklist({
      name: 'Temp #5 child',
      parentId: parent.id,
    })
    client.setQueryData(listKeys.entries(child.id), [{ linkId: 99999 }])

    const { result } = renderHook(() => useDeleteChecklist(), { wrapper: wrapper(client) })

    result.current.mutate(parent.id)
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(client.getQueryState(listKeys.entries(child.id))?.isInvalidated).toBe(true)
  })

  it('el mock también cascadea al borrar: los entries de una sub-carpeta borrada quedan huérfanos si no se limpian', async () => {
    // Reproduce el hallazgo del revisor sobre `handlers.ts`: `removeChecklistNode`
    // borra el nodo del árbol, pero `delete entriesByChecklist[id]` solo limpia
    // el nivel borrado, no sus descendientes. Sin este fix, entries(child.id)
    // sigue devolviendo el link huérfano después de borrar la carpeta padre.
    const parent = await listsService.createChecklist({ name: 'Temp #5b parent' })
    const child = await listsService.createChecklist({
      name: 'Temp #5b child',
      parentId: parent.id,
    })
    const orphanEntry: ListEntry = {
      linkId: 88888,
      kind: 'version',
      displayName: 'Orphan entry',
      imageUrl: null,
      order: 0,
      contentType: 'V',
      franchiseId: 1,
      notes: null,
    }
    entriesByChecklist[child.id] = [orphanEntry]

    await listsService.deleteChecklist(parent.id)

    const entries = await listsService.getEntries(child.id)
    expect(entries).toEqual([])
  })
})
