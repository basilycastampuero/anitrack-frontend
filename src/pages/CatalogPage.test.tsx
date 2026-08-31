import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { http, HttpResponse } from 'msw'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { server } from '@/mocks/server'
import CatalogPage from '@/pages/CatalogPage'
import { t } from '@/i18n/en'

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

function renderCatalog(url = '/catalog') {
  // Sin reintentos: un error del handler debe pintar el ErrorState de inmediato.
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
  return render(<CatalogPage />, { wrapper: Wrapper })
}

describe('CatalogPage', () => {
  it('pinta el grid de franquicias cuando hay datos', async () => {
    renderCatalog()

    expect(
      await screen.findByRole('heading', { name: 'Fullmetal Alchemist' }),
    ).toBeInTheDocument()
    // Cada card es un link al detalle de la franquicia.
    expect(screen.getAllByRole('link').length).toBeGreaterThan(1)
  })

  it('respeta los filtros de la URL', async () => {
    renderCatalog('/catalog?q=Fullmetal')

    expect(
      await screen.findByRole('heading', { name: 'Fullmetal Alchemist' }),
    ).toBeInTheDocument()
    expect(screen.getAllByRole('link')).toHaveLength(1)
  })

  it('muestra "sin resultados" con acción de limpiar cuando el filtro no matchea', async () => {
    renderCatalog('/catalog?q=noexisteestaserie')

    expect(await screen.findByText(t.states.noResultsTitle)).toBeInTheDocument()
    // Hay dos: el del FilterBar (siempre montado) y el de la acción del EmptyState.
    expect(
      screen.getAllByRole('button', { name: t.common.clearFilters }),
    ).toHaveLength(2)
  })

  it('sin filtros activos, el vacío no ofrece limpiar filtros', async () => {
    server.use(
      http.get('/api/v1/franchises', () =>
        HttpResponse.json({ items: [], page: 1, pageSize: 24, total: 0 }),
      ),
    )
    renderCatalog()

    expect(
      await screen.findByText(t.states.emptyCatalogTitle),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: t.common.clearFilters }),
    ).not.toBeInTheDocument()
  })

  it('pinta el ErrorState si la petición falla', async () => {
    server.use(
      http.get('/api/v1/franchises', () =>
        HttpResponse.json(
          { error: { code: 'INTERNAL', message: 'boom' } },
          { status: 500 },
        ),
      ),
    )
    renderCatalog()

    expect(await screen.findByText(t.states.errorTitle)).toBeInTheDocument()
  })

  it('no muestra paginación cuando todo entra en una página', async () => {
    renderCatalog()

    await screen.findByRole('heading', { name: 'Fullmetal Alchemist' })
    expect(
      screen.queryByRole('navigation', { name: /pagination/i }),
    ).not.toBeInTheDocument()
  })
})
