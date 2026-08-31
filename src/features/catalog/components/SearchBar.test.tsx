import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { server } from '@/mocks/server'
import { SearchBar } from '@/features/catalog/components/SearchBar'
import { t } from '@/i18n/en'

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => {
  server.resetHandlers()
  server.events.removeAllListeners()
})
afterAll(() => server.close())

/** Refleja la ruta actual para poder assertear navegación sin montar páginas reales. */
function LocationDisplay() {
  const location = useLocation()
  return <div data-testid="location">{location.pathname + location.search}</div>
}

function renderSearchBar() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/']}>
        <SearchBar />
        <LocationDisplay />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('SearchBar', () => {
  it('debounce: tipear rápido no dispara una request por tecla', async () => {
    // Timers reales a propósito, no fake timers: el mock server simula 200-600ms
    // de latencia real (ADR-008) con el `delay()` de `msw`, que corre sobre el
    // mismo `setTimeout` global -- mezclarlo con fake timers exige avanzar
    // también esa latencia interna, no solo el debounce, y es más frágil que
    // simplemente dejar correr el reloj real y esperar con margen.
    const user = userEvent.setup()
    let requestCount = 0
    server.events.on('request:start', ({ request }) => {
      if (new URL(request.url).pathname.endsWith('/search')) requestCount++
    })

    renderSearchBar()
    const input = screen.getByRole('combobox', { name: t.search.inputLabel })
    await user.type(input, 'gate')

    // Justo después de tipear (bien por debajo de los 300ms de debounce),
    // todavía no debería haber pegado al backend.
    expect(requestCount).toBe(0)

    expect(
      await screen.findByText('Steins;Gate (VN)', {}, { timeout: 2000 }),
    ).toBeInTheDocument()
    expect(requestCount).toBe(1)
  })

  it('muestra el alias que matcheó junto al nombre principal cuando difieren', async () => {
    const user = userEvent.setup()
    renderSearchBar()
    const input = screen.getByRole('combobox', { name: t.search.inputLabel })

    // "Kyojin" matchea el alias japonés de la franquicia (f.name real es
    // "Attack on Titan"): ese primer hit (franquicia) debe mostrar ambos
    // nombres. El segundo hit (el content, cuyo propio nombre ya es
    // "Shingeki no Kyojin") no lleva alias porque ahí name === mainName.
    await user.type(input, 'Kyojin')
    // Espera a que termine de cargar (el "see all" se renderiza siempre, aun en
    // loading, así que hay que esperar contenido real, no solo `role=option`).
    const aliasLine = await screen.findByText(t.search.aliasFor('Attack on Titan'))
    const franchiseHit = aliasLine.closest('li')!

    expect(within(franchiseHit).getByText('Shingeki no Kyojin')).toBeInTheDocument()
  })

  it('navegación por teclado: ArrowDown + Enter va al hit resaltado', async () => {
    const user = userEvent.setup()
    renderSearchBar()
    const input = screen.getByRole('combobox', { name: t.search.inputLabel })

    // "gate" trae 3 hits de Steins;Gate en este orden: franquicia, game, video.
    // Se espera el contenido real (no solo `role=option`, que el "see all"
    // ya satisface incluso mientras la búsqueda sigue en curso).
    await user.type(input, 'gate')
    await screen.findByText('Steins;Gate (VN)')

    // franquicia (índice 0) -> game (índice 1)
    await user.keyboard('{ArrowDown}{ArrowDown}{Enter}')

    expect(await screen.findByTestId('location')).toHaveTextContent(
      '/franchise/9/content/111-steins-gate-vn',
    )
    // Al navegar, el combobox se limpia y cierra.
    expect(input).toHaveValue('')
  })

  it('sin resultados: muestra el mensaje de "sin matches" y conserva "ver todos"', async () => {
    const user = userEvent.setup()
    renderSearchBar()
    const input = screen.getByRole('combobox', { name: t.search.inputLabel })

    await user.type(input, 'zzznoexiste')

    expect(await screen.findByText(t.search.noMatches)).toBeInTheDocument()
    expect(
      screen.getByRole('option', { name: t.search.seeAllResults('zzznoexiste') }),
    ).toBeInTheDocument()
  })

  it('Enter sin selección navega a la página de resultados completa', async () => {
    const user = userEvent.setup()
    renderSearchBar()
    const input = screen.getByRole('combobox', { name: t.search.inputLabel })

    await user.type(input, 'gate')
    await screen.findByText('Steins;Gate (VN)')

    await user.keyboard('{Enter}')

    expect(await screen.findByTestId('location')).toHaveTextContent('/search?q=gate')
  })

  it('Escape cierra el dropdown sin borrar el texto tipeado', async () => {
    const user = userEvent.setup()
    renderSearchBar()
    const input = screen.getByRole('combobox', { name: t.search.inputLabel })

    await user.type(input, 'gate')
    await screen.findByText('Steins;Gate (VN)')

    await user.keyboard('{Escape}')

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    expect(input).toHaveValue('gate')
  })
})
