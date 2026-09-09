import { describe, it, expect, beforeAll, beforeEach, afterEach, afterAll } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { http, HttpResponse } from 'msw'
import type { ReactNode } from 'react'
import { server } from '@/mocks/server'
import { useMe } from '@/features/auth/hooks/useMe'
import { useSessionStore } from '@/store/sessionStore'

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

beforeEach(() => {
  useSessionStore.setState({ user: null, status: 'idle' })
})

function wrapper(client: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>
  }
}

describe('useMe', () => {
  it('una sesión vencida (401 en refetch) limpia el store aunque TanStack Query retenga el `data` viejo', async () => {
    const client = new QueryClient()
    const { result } = renderHook(() => useMe(), { wrapper: wrapper(client) })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(useSessionStore.getState().status).toBe('authenticated')

    // El backend dice que la cookie venció. TanStack Query v5 retiene el
    // último `data` bueno en la transición a error (no lo pisa con
    // `undefined`) — por eso el bug de #1 chequeaba `if (query.data)` primero
    // y nunca llegaba a ver el error.
    server.use(
      http.get('/api/v1/auth/me', () =>
        HttpResponse.json(
          { error: { code: 'UNAUTHORIZED', message: 'Session expired' } },
          { status: 401 },
        ),
      ),
    )

    await act(async () => {
      await result.current.refetch()
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
    // Prueba de la trampa: el `data` viejo sigue ahí a pesar del error.
    expect(result.current.data).toBeDefined()
    expect(useSessionStore.getState().status).toBe('unauthenticated')
    expect(useSessionStore.getState().user).toBeNull()
  })
})
