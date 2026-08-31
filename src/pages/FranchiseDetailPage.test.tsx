import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { http, HttpResponse } from 'msw'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { server } from '@/mocks/server'
import FranchiseDetailPage from '@/pages/FranchiseDetailPage'
import { paths } from '@/router/paths'
import { t } from '@/i18n/en'
import { TooltipProvider } from '@/components/ui/tooltip'

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

function renderFranchiseDetail(url: string) {
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
      <Route path={paths.franchise} element={<FranchiseDetailPage />} />
    </Routes>,
    { wrapper: Wrapper },
  )
}

describe('FranchiseDetailPage', () => {
  it('pinta header y tabs, con la tab Videos por default mostrando episodios desconocidos', async () => {
    // Pokémon (id 2, seed): game "Scarlet" + video "Pokémon Horizons" (en emisión, episodes:0).
    renderFranchiseDetail('/franchise/2-pokemon')

    expect(
      await screen.findByRole('heading', { name: 'Pokémon', level: 1 }),
    ).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: t.card.videos })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: t.card.games })).toBeInTheDocument()
    expect(screen.getByText('Pokémon Horizons')).toBeInTheDocument()
    // episodes: 0 nunca se muestra como "0 episodes".
    expect(screen.getByText(t.detail.version.episodesUnknown)).toBeInTheDocument()
  })

  it('cambia a la tab Games y muestra su contenido', async () => {
    const user = userEvent.setup()
    renderFranchiseDetail('/franchise/2-pokemon')
    await screen.findByRole('heading', { name: 'Pokémon', level: 1 })

    await user.click(screen.getByRole('tab', { name: t.card.games }))

    expect(await screen.findByText('Scarlet')).toBeInTheDocument()
  })

  it('oculta las tabs cuando la franquicia tiene un solo tipo de contenido', async () => {
    // Demon Slayer (id 3, seed): solo video, sin games. Content multi-versión.
    renderFranchiseDetail('/franchise/3-demon-slayer')

    expect(
      await screen.findByRole('heading', { name: 'Demon Slayer', level: 1 }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument()
    expect(screen.getByText('Season 1 (JP)')).toBeInTheDocument()
    expect(screen.getByText('Season 2 (JP)')).toBeInTheDocument()
    expect(screen.getByText('Latino Dub')).toBeInTheDocument()
  })

  it('muestra la galería colapsada y la expande al click (tarea 2.7)', async () => {
    const user = userEvent.setup()
    // Fullmetal Alchemist (id 1, seed): 2 imágenes en `gallery`.
    renderFranchiseDetail('/franchise/1-fullmetal-alchemist')
    await screen.findByRole('heading', { name: 'Fullmetal Alchemist', level: 1 })

    const trigger = screen.getByRole('button', { name: t.detail.gallery.show(2) })
    expect(screen.queryByRole('img', { name: 'Key visual' })).not.toBeInTheDocument()

    await user.click(trigger)

    expect(await screen.findByRole('img', { name: 'Key visual' })).toBeInTheDocument()
  })

  it('no muestra el trigger de galería si la franquicia no tiene imágenes', async () => {
    // Cyberpunk: Edgerunners (id 6, seed): `gallery: []`.
    renderFranchiseDetail('/franchise/6-cyberpunk-edgerunners')
    await screen.findByRole('heading', { name: 'Cyberpunk: Edgerunners', level: 1 })

    expect(
      screen.queryByRole('button', { name: /gallery/i }),
    ).not.toBeInTheDocument()
  })

  it('muestra "not found" si la franquicia no existe', async () => {
    renderFranchiseDetail('/franchise/9999-inexistente')

    expect(
      await screen.findByText(t.states.franchiseNotFoundTitle),
    ).toBeInTheDocument()
  })

  it('pinta el ErrorState ante un error genérico del servidor', async () => {
    server.use(
      http.get('/api/v1/franchises/:id', () =>
        HttpResponse.json(
          { error: { code: 'INTERNAL', message: 'boom' } },
          { status: 500 },
        ),
      ),
    )
    renderFranchiseDetail('/franchise/2-pokemon')

    expect(await screen.findByText(t.states.errorTitle)).toBeInTheDocument()
  })
})
