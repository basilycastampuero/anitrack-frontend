import { describe, it, expect, beforeAll, beforeEach, afterEach, afterAll } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { http, HttpResponse } from 'msw'
import type { ReactNode } from 'react'
import { server } from '@/mocks/server'
import AuthCallbackPage from '@/pages/AuthCallbackPage'
import { paths } from '@/router/paths'
import { t } from '@/i18n/en'
import { useSessionStore } from '@/store/sessionStore'
import { authKeys } from '@/features/auth/hooks/queryKeys'
import type { UserSession } from '@/features/auth/types'

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

beforeEach(() => {
  useSessionStore.setState({ user: null, status: 'idle' })
})

function renderCallback(url: string, client = new QueryClient({ defaultOptions: { queries: { retry: false } } })) {
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={[url]}>{children}</MemoryRouter>
      </QueryClientProvider>
    )
  }
  return render(
    <Routes>
      <Route path={paths.authCallback} element={<AuthCallbackPage />} />
      <Route path={paths.home} element={<div>Home screen</div>} />
      <Route path={paths.myLists} element={<div>My lists screen</div>} />
      <Route path={paths.login} element={<div>Login screen</div>} />
    </Routes>,
    { wrapper: Wrapper },
  )
}

describe('AuthCallbackPage', () => {
  it('?error=access_denied muestra un mensaje propio y un link de vuelta al login', async () => {
    renderCallback(`${paths.authCallback}?error=access_denied`)

    expect(await screen.findByText(t.auth.callback.errorTitle)).toBeInTheDocument()
    expect(screen.getByText(t.auth.callback.accessDenied)).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: t.auth.callback.backToLogin }),
    ).toHaveAttribute('href', paths.login)
    // No debe haber intentado resolver/navegar la sesión.
    expect(useSessionStore.getState().status).toBe('idle')
  })

  it('sin error resuelve la sesión y redirige a home', async () => {
    // Sesión mock por defecto: usuario 1 ya "logueado" del lado de MSW
    // (ver src/mocks/handlers.ts), así que GET /auth/me resuelve en éxito.
    renderCallback(paths.authCallback)

    expect(await screen.findByText('Home screen')).toBeInTheDocument()
    expect(useSessionStore.getState().status).toBe('authenticated')
  })

  it('sin error respeta ?next= para el destino post-callback', async () => {
    renderCallback(`${paths.authCallback}?next=%2Fmy-lists`)

    expect(await screen.findByText('My lists screen')).toBeInTheDocument()
  })

  it('no navega con la identidad cacheada de una sesión anterior si el OAuth actual falló (sin cookie)', async () => {
    // Simula el caso real: RootLayout ya había resuelto `authKeys.me()` con un
    // usuario de una sesión previa (queda en cache). Llega un nuevo intento de
    // OAuth que en realidad falló del lado del backend (nunca puso la cookie),
    // así que /auth/me devuelve 401 en este mount. `me.isSuccess` es `true`
    // desde el primer render solo por la cache stale — no prueba que ESTA
    // sesión de página haya resuelto nada.
    const staleUser: UserSession = {
      id: 99,
      odooUserId: 199,
      name: 'Old Session User',
      email: 'old@example.com',
      avatarUrl: null,
    }
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    client.setQueryData(authKeys.me(), staleUser)

    server.use(
      http.get('/api/v1/auth/me', () =>
        HttpResponse.json(
          { error: { code: 'UNAUTHORIZED', message: 'No active session' } },
          { status: 401 },
        ),
      ),
    )

    renderCallback(paths.authCallback, client)

    // Nunca debería llegar a Home con la identidad vieja.
    await waitFor(() => {
      expect(screen.queryByText('Home screen')).not.toBeInTheDocument()
    })
    // Debe terminar en el estado de error de sesión, no colgado ni navegado.
    expect(await screen.findByText(t.auth.callback.errorTitle)).toBeInTheDocument()
    expect(useSessionStore.getState().status).not.toBe('authenticated')
  })
})
