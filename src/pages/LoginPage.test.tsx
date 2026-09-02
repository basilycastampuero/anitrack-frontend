import { describe, it, expect, beforeAll, beforeEach, afterEach, afterAll } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { http, HttpResponse } from 'msw'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { server } from '@/mocks/server'
import LoginPage from '@/pages/LoginPage'
import { paths } from '@/router/paths'
import { t } from '@/i18n/en'
import { useSessionStore } from '@/store/sessionStore'

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

beforeEach(() => {
  useSessionStore.setState({ user: null, status: 'idle' })
})

function renderLogin(url: string = paths.login) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={[url]}>{children}</MemoryRouter>
      </QueryClientProvider>
    )
  }
  return render(
    <Routes>
      <Route path={paths.login} element={<LoginPage />} />
      <Route path={paths.home} element={<div>Home screen</div>} />
      <Route path="/my-lists" element={<div>My lists screen</div>} />
    </Routes>,
    { wrapper: Wrapper },
  )
}

describe('LoginPage', () => {
  it('valida el formulario del lado cliente antes de pegarle a la API', async () => {
    const user = userEvent.setup()
    renderLogin()

    await user.click(screen.getByRole('button', { name: t.auth.login.submit }))

    expect(await screen.findByText(t.auth.errors.emailRequired)).toBeInTheDocument()
    expect(screen.getByText(t.auth.errors.passwordRequired)).toBeInTheDocument()
  })

  it('éxito: loguea y redirige a ?next=', async () => {
    const user = userEvent.setup()
    renderLogin('/login?next=%2Fmy-lists')

    await user.type(screen.getByLabelText(t.auth.emailLabel), 'alex@example.com')
    await user.type(screen.getByLabelText(t.auth.passwordLabel), 'password123')
    await user.click(screen.getByRole('button', { name: t.auth.login.submit }))

    expect(await screen.findByText('My lists screen')).toBeInTheDocument()
    expect(useSessionStore.getState().status).toBe('authenticated')
  })

  it('credenciales malas: error de formulario genérico, sin decir si el email existe', async () => {
    const user = userEvent.setup()
    renderLogin()

    await user.type(screen.getByLabelText(t.auth.emailLabel), 'alex@example.com')
    await user.type(screen.getByLabelText(t.auth.passwordLabel), 'incorrecta')
    await user.click(screen.getByRole('button', { name: t.auth.login.submit }))

    expect(
      await screen.findByText(t.auth.errors.invalidCredentials),
    ).toBeInTheDocument()
    expect(useSessionStore.getState().status).not.toBe('authenticated')
  })

  it('error de servidor: reemplaza el form por un ErrorState con retry', async () => {
    server.use(
      http.post('/api/v1/auth/login', () =>
        HttpResponse.json(
          { error: { code: 'INTERNAL', message: 'boom' } },
          { status: 500 },
        ),
      ),
    )
    const user = userEvent.setup()
    renderLogin()

    await user.type(screen.getByLabelText(t.auth.emailLabel), 'alex@example.com')
    await user.type(screen.getByLabelText(t.auth.passwordLabel), 'password123')
    await user.click(screen.getByRole('button', { name: t.auth.login.submit }))

    expect(await screen.findByRole('alert')).toBeInTheDocument()
    expect(screen.getByText(t.states.errorTitle)).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: t.common.retry }),
    ).toBeInTheDocument()
  })
})
