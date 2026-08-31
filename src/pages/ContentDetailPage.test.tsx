import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { http, HttpResponse } from 'msw'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { server } from '@/mocks/server'
import ContentDetailPage from '@/pages/ContentDetailPage'
import { paths } from '@/router/paths'
import { t } from '@/i18n/en'
import { TooltipProvider } from '@/components/ui/tooltip'

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

function renderContentDetail(url: string) {
  // Sin reintentos: un error del handler debe pintar el ErrorState de inmediato.
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
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
      <Route path={paths.content} element={<ContentDetailPage />} />
    </Routes>,
    { wrapper: Wrapper },
  )
}

describe('ContentDetailPage', () => {
  it('el deep-link directo a un content funciona sin pasar por el catálogo', async () => {
    // Pokémon Horizons (content id 103, seed) navegado directo por URL.
    renderContentDetail('/franchise/2-pokemon/content/103-pokemon-horizons')

    expect(
      await screen.findByRole('heading', { name: 'Pokémon Horizons' }),
    ).toBeInTheDocument()
    // Breadcrumb de vuelta a la franquicia dueña, resuelta desde la propia
    // respuesta (doc 04: `content.franchise`), no del segmento `:id` de la URL.
    expect(screen.getByRole('link', { name: 'Pokémon' })).toBeInTheDocument()
    // episodes: 0 (en emisión) nunca se muestra como "0 episodes".
    expect(screen.getByText(t.detail.version.episodesUnknown)).toBeInTheDocument()
  })

  it('muestra "not found" si el content no existe', async () => {
    renderContentDetail('/franchise/2-pokemon/content/999999-inexistente')

    expect(
      await screen.findByText(t.states.contentNotFoundTitle),
    ).toBeInTheDocument()
  })

  it('pinta el ErrorState ante un error genérico del servidor', async () => {
    server.use(
      http.get('/api/v1/contents/:id', () =>
        HttpResponse.json(
          { error: { code: 'INTERNAL', message: 'boom' } },
          { status: 500 },
        ),
      ),
    )
    renderContentDetail('/franchise/2-pokemon/content/103-pokemon-horizons')

    expect(await screen.findByText(t.states.errorTitle)).toBeInTheDocument()
  })
})
