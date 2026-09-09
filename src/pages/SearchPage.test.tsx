import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { http, HttpResponse } from 'msw'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { server } from '@/mocks/server'
import SearchPage from '@/pages/SearchPage'
import { t } from '@/i18n/en'

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => {
  server.resetHandlers()
  server.events.removeAllListeners()
})
afterAll(() => server.close())

function renderSearchPage(url: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={[url]}>{children}</MemoryRouter>
      </QueryClientProvider>
    )
  }
  return render(<SearchPage />, { wrapper: Wrapper })
}

describe('SearchPage', () => {
  it('sin q en la URL, pide escribir en el buscador (sin pegarle al catálogo)', async () => {
    let franchisesRequested = false
    server.events.on('request:start', ({ request }) => {
      if (new URL(request.url).pathname.endsWith('/franchises')) franchisesRequested = true
    })

    renderSearchPage('/search')

    expect(await screen.findByText(t.search.promptTitle)).toBeInTheDocument()
    expect(franchisesRequested).toBe(false)
  })

  it('con q que matchea, pinta el heading y el grid reusando FranchiseCard', async () => {
    renderSearchPage('/search?q=Steins')

    expect(
      await screen.findByRole('heading', { name: t.search.resultsFor('Steins') }),
    ).toBeInTheDocument()
    expect(
      await screen.findByRole('link', { name: /Steins;Gate/ }),
    ).toBeInTheDocument()
  })

  it('sin resultados, ofrece limpiar filtros y volver al estado de búsqueda vacía', async () => {
    const user = userEvent.setup()
    renderSearchPage('/search?q=zzznoexiste')

    expect(
      await screen.findByText(t.search.noResultsBody('zzznoexiste')),
    ).toBeInTheDocument()

    // Hay dos: el del FilterBar (siempre montado, ver CatalogPage.test.tsx) y
    // el de la acción del EmptyState. Cualquiera de los dos limpia todo,
    // volviendo (también) el `q` a vacío.
    const clearButtons = screen.getAllByRole('button', { name: t.common.clearFilters })
    expect(clearButtons).toHaveLength(2)
    await user.click(clearButtons[0]!)

    expect(await screen.findByText(t.search.promptTitle)).toBeInTheDocument()
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
    renderSearchPage('/search?q=Steins')

    expect(await screen.findByText(t.states.errorTitle)).toBeInTheDocument()
  })
})
