import {
  describe,
  it,
  expect,
  beforeAll,
  beforeEach,
  afterEach,
  afterAll,
} from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { server } from '@/mocks/server'
import ProfilePage from '@/pages/ProfilePage'
import PublicListPage from '@/pages/PublicListPage'
import { paths } from '@/router/paths'
import { useSessionStore } from '@/store/sessionStore'
import { t } from '@/i18n/en'

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

beforeEach(() => {
  useSessionStore.setState({ user: null, status: 'unauthenticated' })
})

function renderAt(url: string) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={[url]}>{children}</MemoryRouter>
      </QueryClientProvider>
    )
  }
  return render(
    <Routes>
      <Route path={paths.profile} element={<ProfilePage />} />
      <Route path={paths.publicList} element={<PublicListPage />} />
    </Routes>,
    { wrapper: Wrapper },
  )
}

describe('ProfilePage', () => {
  it('CA: perfil poblado muestra stats del contrato y sus listas publicadas', async () => {
    renderAt('/profile/1')

    expect(
      await screen.findByRole('heading', { name: 'Alex Rivera' }),
    ).toBeInTheDocument()
    // Las stats llegan calculadas del backend y solo sobre listas publicadas:
    // "Watching" (3 version-links) + "Completed" (2) = 5 entries.
    expect(screen.getByText(t.profile.totalEntries)).toBeInTheDocument()
    expect(screen.getByText('5')).toBeInTheDocument()
    // Solo las publicadas: "Favorites" y sus hijas son privadas.
    expect(screen.getByRole('link', { name: /Watching/ })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Completed/ })).toBeInTheDocument()
    expect(
      screen.queryByRole('link', { name: /Favorites/ }),
    ).not.toBeInTheDocument()
  })

  it('CA: perfil sin listas publicadas muestra el EmptyState', async () => {
    // Usuario 2 del seed (Sam Cortez) no tiene ninguna checklist.
    renderAt('/profile/2')

    expect(await screen.findByText(t.profile.emptyTitle)).toBeInTheDocument()
    expect(
      screen.queryByRole('link', { name: /Watching/ }),
    ).not.toBeInTheDocument()
  })

  it('un perfil inexistente no ofrece reintentar: es una dirección que no lleva a nada', async () => {
    renderAt('/profile/999')

    expect(await screen.findByText(t.profile.notFoundTitle)).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: t.common.retry }),
    ).not.toBeInTheDocument()
  })

  it('el aviso de "estas listas son públicas" sale solo en el perfil propio', async () => {
    renderAt('/profile/1')
    expect(
      await screen.findByRole('heading', { name: 'Alex Rivera' }),
    ).toBeInTheDocument()
    expect(screen.queryByText(t.profile.ownBannerTitle)).not.toBeInTheDocument()

    useSessionStore.setState({
      user: {
        id: 1,
        odooUserId: 11,
        name: 'Alex Rivera',
        email: 'a@b.c',
        avatarUrl: null,
      },
      status: 'authenticated',
    })
    renderAt('/profile/1')
    expect(
      await screen.findAllByText(t.profile.ownBannerTitle),
    ).not.toHaveLength(0)
  })
})

describe('PublicListPage', () => {
  it('muestra los entries de una lista publicada, en modo lectura (sin stepper)', async () => {
    renderAt('/profile/1/list/1')

    expect(
      await screen.findByText('Demon Slayer — Season 1'),
    ).toBeInTheDocument()
    // Sin `checklistId`, `ListEntryRow` no renderiza el stepper: esta vista no
    // puede escribir, y por contrato tampoco existe el endpoint.
    expect(
      screen.queryByRole('button', { name: /One episode more/ }),
    ).not.toBeInTheDocument()
  })

  it('CA: un deep-link a una lista privada ANIDADA da el estado de error, nunca los entries', async () => {
    // "2010s" (id 6) es privada y cuelga de tres carpetas privadas. El backend
    // responde 404 —no 403— para no confirmar que el id existe.
    renderAt('/profile/1/list/6')

    expect(
      await screen.findByText(t.profile.listUnavailableTitle),
    ).toBeInTheDocument()
    expect(screen.queryByText('Steins;Gate')).not.toBeInTheDocument()
  })
})
