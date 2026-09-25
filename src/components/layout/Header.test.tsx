import { describe, it, expect, beforeAll, beforeEach, afterEach, afterAll } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { server } from '@/mocks/server'
import { Header } from '@/components/layout/Header'
import { useSessionStore } from '@/store/sessionStore'
import { t } from '@/i18n/en'

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

const user = {
  id: 7,
  odooUserId: 21,
  name: 'Alex Rivera',
  email: 'alex@example.com',
  avatarUrl: null,
}

beforeEach(() => {
  useSessionStore.setState({ user, status: 'authenticated' })
})

/** Sonda de ruta: el menú navega, y sin esto no hay forma de afirmarlo. */
function Location() {
  const location = useLocation()
  return <span data-testid="location">{location.pathname}</span>
}

function renderHeader() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/catalog']}>
        <Header />
        <Location />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('Header — menú de cuenta (4.13)', () => {
  it('CA: el avatar abre un menú con perfil, ajustes y cerrar sesión', async () => {
    const ui = userEvent.setup()
    renderHeader()

    // El trigger es el avatar, que no tiene texto: se lo nombra por aria-label.
    await ui.click(screen.getByRole('button', { name: t.auth.account.menu(user.name) }))

    const items = await screen.findAllByRole('menuitem')
    expect(items.map((item) => item.textContent)).toEqual([
      t.nav.profile,
      t.nav.settings,
      t.auth.account.logout,
    ])
  })

  it('CA: "Ajustes" lleva a /settings', async () => {
    const ui = userEvent.setup()
    renderHeader()

    await ui.click(screen.getByRole('button', { name: t.auth.account.menu(user.name) }))
    await ui.click(await screen.findByRole('menuitem', { name: t.nav.settings }))

    expect(screen.getByTestId('location').textContent).toBe('/settings')
  })

  it('CA: cerrar sesión limpia la sesión y vuelve al home', async () => {
    const ui = userEvent.setup()
    renderHeader()

    await ui.click(screen.getByRole('button', { name: t.auth.account.menu(user.name) }))
    await ui.click(await screen.findByRole('menuitem', { name: t.auth.account.logout }))

    // La navegación es sincrónica (ver useSignOut); el store se limpia cuando
    // resuelve el POST /auth/logout, de ahí el waitFor sobre el store.
    expect(screen.getByTestId('location').textContent).toBe('/')
    await waitFor(() => expect(useSessionStore.getState().user).toBeNull())
    expect(useSessionStore.getState().status).toBe('unauthenticated')
  })

  it('sin sesión no hay menú de cuenta, hay CTA de login', () => {
    useSessionStore.setState({ user: null, status: 'unauthenticated' })
    renderHeader()

    expect(
      screen.queryByRole('button', { name: t.auth.account.menu(user.name) }),
    ).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: t.nav.login })).toBeInTheDocument()
  })
})
