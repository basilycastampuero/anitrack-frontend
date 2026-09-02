import { describe, it, expect, beforeAll, beforeEach, afterEach, afterAll } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { server } from '@/mocks/server'
import { useRegister } from '@/features/auth/hooks/useRegister'
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

describe('useRegister', () => {
  it('en éxito autentica de una: sesión fijada y authKeys.me() sembrado', async () => {
    const client = new QueryClient()
    const { result } = renderHook(() => useRegister(), { wrapper: wrapper(client) })

    result.current.mutate({
      name: 'New Person',
      email: 'newperson@example.com',
      password: 'password123',
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(useSessionStore.getState().status).toBe('authenticated')
    expect(useSessionStore.getState().user?.email).toBe('newperson@example.com')
    expect(client.getQueryData(authKeys.me())).toMatchObject({
      email: 'newperson@example.com',
    })
  })

  it('con un email ya usado rechaza VALIDATION con field="email"', async () => {
    const client = new QueryClient()
    const { result } = renderHook(() => useRegister(), { wrapper: wrapper(client) })

    result.current.mutate({
      name: 'Alex Duplicado',
      email: 'alex@example.com', // ya existe en el seed (mocks/seed/lists.ts)
      password: 'password123',
    })

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(result.current.error).toMatchObject({ code: 'VALIDATION', field: 'email' })
    expect(useSessionStore.getState().status).not.toBe('authenticated')
  })
})
