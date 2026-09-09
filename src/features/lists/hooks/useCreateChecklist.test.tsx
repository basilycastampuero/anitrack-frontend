import { describe, it, expect, beforeAll, beforeEach, afterEach, afterAll } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { server } from '@/mocks/server'
import { useCreateChecklist } from '@/features/lists/hooks/useCreateChecklist'
import { useChecklists } from '@/features/lists/hooks/useChecklists'
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

describe('useCreateChecklist', () => {
  it('crea la carpeta e invalida tree() para que el árbol quede actualizado', async () => {
    const client = new QueryClient()
    const { result } = renderHook(
      () => ({ tree: useChecklists(), create: useCreateChecklist() }),
      { wrapper: wrapper(client) },
    )

    await waitFor(() => expect(result.current.tree.isSuccess).toBe(true))
    const initialCount = result.current.tree.data?.length ?? 0

    result.current.create.mutate({ name: 'Rewatch queue' })
    await waitFor(() => expect(result.current.create.isSuccess).toBe(true))

    await waitFor(() => {
      expect(result.current.tree.data).toHaveLength(initialCount + 1)
    })
    expect(
      result.current.tree.data?.some((node) => node.name === 'Rewatch queue'),
    ).toBe(true)
  })

  it('con un parentId inexistente rechaza con NOT_FOUND', async () => {
    const client = new QueryClient()
    const { result } = renderHook(() => useCreateChecklist(), {
      wrapper: wrapper(client),
    })

    result.current.mutate({ name: 'Orphan', parentId: 999_999 })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error).toMatchObject({ code: 'NOT_FOUND' })
  })
})
