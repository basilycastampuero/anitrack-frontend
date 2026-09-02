import { describe, it, expect, beforeAll, beforeEach, afterEach, afterAll } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { http, HttpResponse } from 'msw'
import type { ReactNode } from 'react'
import { server } from '@/mocks/server'
import { useLogout } from '@/features/auth/hooks/useLogout'
import { authKeys } from '@/features/auth/hooks/queryKeys'
import { listKeys } from '@/features/lists/hooks/queryKeys'
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

function wrapper(client: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>
  }
}

/** Cache privado poblado como si el usuario ya hubiera navegado por la app. */
function seedPrivateCache(client: QueryClient) {
  useSessionStore.setState({ user: fakeUser, status: 'authenticated' })
  client.setQueryData(authKeys.me(), fakeUser)
  client.setQueryData(listKeys.libraryIndex(), {
    versionIds: [1, 2],
    franchiseIds: [1],
  })
}

describe('useLogout', () => {
  beforeEach(() => {
    useSessionStore.setState({ user: null, status: 'idle' })
  })

  it('vacía el cache de auth y lists, y limpia sessionStore (caso de test explícito, doc 12 §3)', async () => {
    const client = new QueryClient()
    seedPrivateCache(client)

    const { result } = renderHook(() => useLogout(), { wrapper: wrapper(client) })
    result.current.mutate()

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(client.getQueryData(authKeys.me())).toBeUndefined()
    expect(client.getQueryData(listKeys.libraryIndex())).toBeUndefined()
    expect(useSessionStore.getState().status).toBe('unauthenticated')
    expect(useSessionStore.getState().user).toBeNull()
  })

  it('si el POST /auth/logout falla igual limpia sesión y cache privado', async () => {
    server.use(
      http.post('/api/v1/auth/logout', () =>
        HttpResponse.json(
          { error: { code: 'INTERNAL', message: 'boom' } },
          { status: 500 },
        ),
      ),
    )
    const client = new QueryClient()
    seedPrivateCache(client)

    const { result } = renderHook(() => useLogout(), { wrapper: wrapper(client) })
    result.current.mutate()

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(client.getQueryData(authKeys.me())).toBeUndefined()
    expect(client.getQueryData(listKeys.libraryIndex())).toBeUndefined()
    expect(useSessionStore.getState().status).toBe('unauthenticated')
  })
})
