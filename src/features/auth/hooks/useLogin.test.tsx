import { describe, it, expect, beforeAll, beforeEach, afterEach, afterAll } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { server } from '@/mocks/server'
import { useLogin } from '@/features/auth/hooks/useLogin'
import { authKeys } from '@/features/auth/hooks/queryKeys'
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

describe('useLogin', () => {
  it('en éxito fija la sesión y siembra authKeys.me() sin refetch', async () => {
    const client = new QueryClient()
    const { result } = renderHook(() => useLogin(), { wrapper: wrapper(client) })

    result.current.mutate({ login: 'alex@example.com', password: 'password123' })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(useSessionStore.getState().status).toBe('authenticated')
    expect(useSessionStore.getState().user?.email).toBe('alex@example.com')
    expect(client.getQueryData(authKeys.me())).toMatchObject({
      email: 'alex@example.com',
    })
  })

  it('con credenciales inválidas rechaza con UNAUTHORIZED y no toca la sesión', async () => {
    const client = new QueryClient()
    const { result } = renderHook(() => useLogin(), { wrapper: wrapper(client) })

    result.current.mutate({ login: 'alex@example.com', password: 'wrong' })

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(result.current.error).toMatchObject({ code: 'UNAUTHORIZED' })
    expect(useSessionStore.getState().status).not.toBe('authenticated')
  })
})
