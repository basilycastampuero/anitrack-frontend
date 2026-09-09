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
import { TooltipProvider } from '@/components/ui/tooltip'

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
        <TooltipProvider>
          <MemoryRouter initialEntries={[url]}>{children}</MemoryRouter>
        </TooltipProvider>
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

  it('modo mock: el botón de Twitch queda deshabilitado con tooltip explicativo', async () => {
    const user = userEvent.setup()
    renderLogin()

    const oauthButton = screen.getByRole('button', { name: t.auth.oauth.twitch })
    expect(oauthButton).toBeDisabled()

    // El trigger del tooltip es el <span> que envuelve al botón deshabilitado
    // (un <button disabled> no dispara eventos de puntero, ver OAuthButtons).
    await user.hover(oauthButton.parentElement as HTMLElement)
    // Radix duplica el texto (contenido visible + un <span role="tooltip">
    // oculto para lectores de pantalla), así que `findByText` ambiguaría con
    // "Found multiple elements" — se apunta al rol accesible en su lugar.
    expect(await screen.findByRole('tooltip')).toHaveTextContent(
      t.auth.oauth.disabledInMock,
    )
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

  it('?next= no interno (protocolo-relativo) no se usa como destino tras el login', async () => {
    // #4 de la revisión: `next` se leía crudo de la query string. Antes del
    // fix, un login exitoso navegaba a `//evil.com` en vez de caer al
    // fallback — acá no hay red externa real, pero si `next` llega intacto
    // a `navigate()` ninguna de las rutas registradas matchea y "Home
    // screen" nunca aparece.
    const user = userEvent.setup()
    renderLogin('/login?next=%2F%2Fevil.com')

    await user.type(screen.getByLabelText(t.auth.emailLabel), 'alex@example.com')
    await user.type(screen.getByLabelText(t.auth.passwordLabel), 'password123')
    await user.click(screen.getByRole('button', { name: t.auth.login.submit }))

    expect(await screen.findByText('Home screen')).toBeInTheDocument()
  })

  it('200 con forma inesperada (drift de contrato): también reemplaza el form por un ErrorState, no se queda mudo', async () => {
    // `auth.service.ts` valida la respuesta con `userEnvelopeSchema.parse` — un
    // 200 con forma distinta lanza un ZodError, no un ApiError. Es el escenario
    // más probable al conectar el Odoo real (drift de contrato), y no puede
    // tratarse como "sin error" (#2 de la revisión).
    server.use(
      http.post('/api/v1/auth/login', () =>
        HttpResponse.json({ usuario: { id: 1 } }, { status: 200 }),
      ),
    )
    const user = userEvent.setup()
    renderLogin()

    await user.type(screen.getByLabelText(t.auth.emailLabel), 'alex@example.com')
    await user.type(screen.getByLabelText(t.auth.passwordLabel), 'password123')
    await user.click(screen.getByRole('button', { name: t.auth.login.submit }))

    expect(await screen.findByText(t.states.errorTitle)).toBeInTheDocument()
    expect(useSessionStore.getState().status).not.toBe('authenticated')
  })
})
