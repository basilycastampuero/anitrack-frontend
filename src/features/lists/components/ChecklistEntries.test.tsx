import { describe, it, expect, beforeAll, beforeEach, afterEach, afterAll } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { http, HttpResponse } from 'msw'
import { server } from '@/mocks/server'
import { ChecklistEntries } from '@/features/lists/components/ChecklistEntries'
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

function renderEntries(checklistId: number | null) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <ChecklistEntries checklistId={checklistId} />
    </QueryClientProvider>,
  )
}

describe('ChecklistEntries', () => {
  it('checklistId=null muestra el prompt de selección, sin pedir entries', () => {
    renderEntries(null)
    expect(screen.getByText('Select a list')).toBeInTheDocument()
  })

  it(
    // CA doc 07/12 §3.6: un entry de versión suelto sin franchise-link se ' +
    'renderiza como fila directa, no envuelto en un grupo (checklist 1 del seed: ' +
    'Demon Slayer suelto + Spy x Family agrupado)',
    async () => {
      renderEntries(1)

      // Suelto: fila directa con su propio progreso, sin trigger de grupo.
      expect(await screen.findByText('Demon Slayer — Season 1')).toBeInTheDocument()
      expect(screen.getByText('12/26')).toBeInTheDocument()
      // Sin trigger colapsable propio: el nombre del entry no es un botón.
      // Se compara el nombre EXACTO porque desde 3.7 la fila sí tiene botones
      // —los del stepper—, y sus `aria-label` mencionan el título.
      expect(
        screen.queryByRole('button', { name: 'Demon Slayer — Season 1' }),
      ).not.toBeInTheDocument()
      // 3.7: la fila editable trae el stepper de episodios.
      expect(
        screen.getByRole('button', { name: 'One episode more of Demon Slayer — Season 1' }),
      ).toBeInTheDocument()

      // Agrupado: header colapsable con el string de progreso agregado y sus hijos.
      expect(screen.getByRole('button', { name: /Spy x Family/ })).toBeInTheDocument()
      expect(screen.getByText('[S1 25/25] - [S2 03/-]')).toBeInTheDocument()
      expect(screen.getByText('Season 1')).toBeInTheDocument()
      expect(screen.getByText('Season 2')).toBeInTheDocument()
    },
  )

  it('lista vacía muestra el EmptyState de entries, no un grid vacío', async () => {
    // Checklist 3 ("Favorites") del seed no tiene entries propios.
    renderEntries(3)
    expect(await screen.findByText('This list is empty')).toBeInTheDocument()
  })

  it('error de red muestra ErrorState con retry', async () => {
    server.use(
      http.get('/api/v1/me/checklists/:id/entries', () =>
        HttpResponse.json({ error: { code: 'INTERNAL', message: 'boom' } }, { status: 500 }),
      ),
    )
    renderEntries(1)
    expect(await screen.findByRole('alert')).toBeInTheDocument()
  })

  it('estado de carga usa el skeleton con forma de lista, no un spinner', () => {
    renderEntries(1)
    expect(document.querySelectorAll('[data-slot="skeleton"]').length).toBeGreaterThan(0)
  })
})
