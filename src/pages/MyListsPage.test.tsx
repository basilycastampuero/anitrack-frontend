import {
  describe,
  it,
  expect,
  beforeAll,
  beforeEach,
  afterEach,
  afterAll,
} from 'vitest'
import { render, screen, within, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { server } from '@/mocks/server'
import MyListsPage from '@/pages/MyListsPage'
import { paths } from '@/router/paths'
import { useSessionStore } from '@/store/sessionStore'
import type { UserSession } from '@/features/auth/types'

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

const fakeUser: UserSession = {
  id: 1,
  odooUserId: 11,
  name: 'Alex Rivera',
  email: 'alex@example.com',
  avatarUrl: null,
}

beforeEach(() => {
  useSessionStore.setState({ user: fakeUser, status: 'authenticated' })
})

/** Refleja la ruta actual para poder assertear navegación (mismo criterio
 * que `SearchBar.test.tsx`). */
function LocationDisplay() {
  const location = useLocation()
  return <div data-testid="location">{location.pathname}</div>
}

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
    <>
      <Routes>
        <Route path={paths.myLists} element={<MyListsPage />} />
        <Route path={paths.myList} element={<MyListsPage />} />
      </Routes>
      <LocationDisplay />
    </>,
    { wrapper: Wrapper },
  )
}

describe('MyListsPage', () => {
  it('borrar la carpeta que se está viendo saca a la URL del id muerto (replace a /my-lists)', async () => {
    renderAt('/my-lists/2') // "Completed" (2, seed)

    const item = await screen.findByRole('treeitem', { name: 'Completed' })
    expect(item).toHaveAttribute('aria-selected', 'true')
    // `toHaveTextContent` matchea substring: '/my-lists' calzaría igual de
    // bien con '/my-lists/2' y con '/my-lists' a secas, así que para afirmar
    // la ruta EXACTA (y no un falso verde si el redirect nunca corriera) hay
    // que comparar `.textContent` a mano.
    expect(screen.getByTestId('location').textContent).toBe('/my-lists/2')

    const user = userEvent.setup()
    await user.click(
      within(item).getByRole('button', { name: 'Actions for Completed' }),
    )
    await user.click(await screen.findByRole('menuitem', { name: 'Delete' }))
    await screen.findByRole('dialog')
    await user.click(screen.getByRole('button', { name: 'Delete' }))

    // El nodo desaparece del árbol ...
    await waitFor(() =>
      expect(
        screen.queryByRole('treeitem', { name: 'Completed' }),
      ).not.toBeInTheDocument(),
    )
    // ... y la URL deja de apuntarle: sin el `useEffect` de la página, se
    // queda en `/my-lists/2` (un id que ya no existe) y el panel de la
    // derecha pide entries de una carpeta borrada para siempre.
    await waitFor(() =>
      expect(screen.getByTestId('location').textContent).toBe('/my-lists'),
    )
  })

  it('una carpeta que sigue existiendo no dispara ningún redirect', async () => {
    renderAt('/my-lists/1') // "Watching" (1, seed) — nunca se borra en este test

    await screen.findByRole('treeitem', { name: 'Watching' })
    // Le da tiempo a la query a resolver y al efecto a correr, para no dar un
    // falso verde por "todavía no hizo nada". Igual que arriba, comparación
    // exacta: '/my-lists' sería un substring falso-positivo de '/my-lists/1'.
    await waitFor(() =>
      expect(screen.getByTestId('location').textContent).toBe('/my-lists/1'),
    )
  })
})
