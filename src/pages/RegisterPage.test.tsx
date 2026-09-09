import { describe, it, expect, beforeAll, beforeEach, afterEach, afterAll } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { http, HttpResponse } from 'msw'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { server } from '@/mocks/server'
import RegisterPage from '@/pages/RegisterPage'
import { paths } from '@/router/paths'
import { t } from '@/i18n/en'
import { useSessionStore } from '@/store/sessionStore'

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

beforeEach(() => {
  useSessionStore.setState({ user: null, status: 'idle' })
})

function renderRegister(url = paths.register) {
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
      <Route path={paths.register} element={<RegisterPage />} />
      <Route path={paths.home} element={<div>Home screen</div>} />
    </Routes>,
    { wrapper: Wrapper },
  )
}

async function fillValidForm(
  user: ReturnType<typeof userEvent.setup>,
  overrides: { name?: string; email?: string; password?: string } = {},
) {
  await user.type(screen.getByLabelText(t.auth.nameLabel), overrides.name ?? 'New Person')
  await user.type(
    screen.getByLabelText(t.auth.emailLabel),
    overrides.email ?? 'newperson@example.com',
  )
  await user.type(
    screen.getByLabelText(t.auth.passwordLabel),
    overrides.password ?? 'password123',
  )
}

describe('RegisterPage', () => {
  it('éxito: crea la cuenta, autentica y redirige a ?next=', async () => {
    const user = userEvent.setup()
    renderRegister('/register')
    await fillValidForm(user)

    await user.click(screen.getByRole('button', { name: t.auth.register.submit }))

    expect(await screen.findByText('Home screen')).toBeInTheDocument()
    expect(useSessionStore.getState().status).toBe('authenticated')
  })

  it('validación de campo: email ya registrado marca el campo email', async () => {
    const user = userEvent.setup()
    renderRegister()
    await fillValidForm(user, { email: 'alex@example.com' })

    await user.click(screen.getByRole('button', { name: t.auth.register.submit }))

    const emailField = screen.getByLabelText(t.auth.emailLabel)
    expect(await screen.findByText('Email is already registered')).toBeInTheDocument()
    expect(emailField).toHaveAttribute('aria-invalid', 'true')
    expect(useSessionStore.getState().status).not.toBe('authenticated')
  })

  it('FORBIDDEN (registro deshabilitado): error de formulario explícito, no ErrorState', async () => {
    server.use(
      http.post('/api/v1/auth/register', () =>
        HttpResponse.json(
          { error: { code: 'FORBIDDEN', message: 'Signup disabled' } },
          { status: 403 },
        ),
      ),
    )
    const user = userEvent.setup()
    renderRegister()
    await fillValidForm(user)

    await user.click(screen.getByRole('button', { name: t.auth.register.submit }))

    expect(
      await screen.findByText(t.auth.errors.registrationUnavailable),
    ).toBeInTheDocument()
    // No debe haber reemplazado el form por el ErrorState genérico.
    expect(screen.queryByText(t.states.errorTitle)).not.toBeInTheDocument()
  })

  it('error de servidor: reemplaza el form por un ErrorState con retry', async () => {
    server.use(
      http.post('/api/v1/auth/register', () =>
        HttpResponse.json(
          { error: { code: 'INTERNAL', message: 'boom' } },
          { status: 500 },
        ),
      ),
    )
    const user = userEvent.setup()
    renderRegister()
    await fillValidForm(user)

    await user.click(screen.getByRole('button', { name: t.auth.register.submit }))

    expect(await screen.findByText(t.states.errorTitle)).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: t.common.retry }),
    ).toBeInTheDocument()
  })

  it('201 con forma inesperada (drift de contrato): también reemplaza el form por un ErrorState, no se queda mudo', async () => {
    // Mismo caso que en LoginPage: `userEnvelopeSchema.parse` lanza ZodError
    // ante una respuesta 2xx con forma distinta, y eso no es un ApiError.
    server.use(
      http.post('/api/v1/auth/register', () =>
        HttpResponse.json({ usuario: { id: 1 } }, { status: 201 }),
      ),
    )
    const user = userEvent.setup()
    renderRegister()
    await fillValidForm(user)

    await user.click(screen.getByRole('button', { name: t.auth.register.submit }))

    expect(await screen.findByText(t.states.errorTitle)).toBeInTheDocument()
    expect(useSessionStore.getState().status).not.toBe('authenticated')
  })
})
