import { describe, it, expect, beforeAll, beforeEach, afterEach, afterAll, vi } from 'vitest'
import { render, screen, waitFor, within, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { http, HttpResponse, delay } from 'msw'
import { server } from '@/mocks/server'
import { ChecklistTree } from '@/features/lists/components/ChecklistTree'
import { listsService } from '@/features/lists/services/lists.service'
import { useSessionStore } from '@/store/sessionStore'
import type { UserSession } from '@/features/auth/types'

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))
import { toast } from 'sonner'

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
  vi.clearAllMocks()
})

function renderTree(onSelect: (id: number) => void = () => {}) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <ChecklistTree selectedId={null} onSelect={onSelect} />
    </QueryClientProvider>,
  )
}

/** Abre el menú contextual de un nodo por mouse y devuelve el `userEvent` ya
 * configurado, para encadenar la selección de un ítem del menú. */
async function openMenuFor(name: string) {
  const user = userEvent.setup()
  const item = await screen.findByRole('treeitem', { name })
  const trigger = within(item).getByRole('button', { name: `Actions for ${name}` })
  await user.click(trigger)
  await screen.findByRole('menu')
  return user
}

// `checklistsByUser`/`entriesByChecklist` son estado mutable a nivel de
// módulo, pero `resetMockDb()` (deuda #7, bitácora 13) lo restaura al seed
// original después de cada test (afterEach global, src/test/setup.ts): los
// tests de este archivo pueden usar directamente los nodos fijos del seed
// (mocks/seed/lists.ts) — "Watching" (1), "Completed" (2), "Favorites" (3,
// sin publicar) — sin arrastrar lo que dejó el test anterior. Solo los casos
// de cascada de borrado (que necesitan un padre con exactamente una
// sub-carpeta y sin entries) siguen creando sus propios nodos, porque ningún
// nodo del seed calza con esa forma exacta.

describe('ChecklistNodeMenu — rename', () => {
  it('renombra de forma optimista y cierra el dialog al confirmar el servidor', async () => {
    renderTree()
    const user = await openMenuFor('Watching')
    await user.click(screen.getByRole('menuitem', { name: 'Rename' }))

    const input = await screen.findByLabelText('Name')
    await user.clear(input)
    await user.type(input, 'Renamed live')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    // Optimista: el árbol muestra el nombre nuevo antes de que el PATCH (200ms
    // de latencia simulada) resuelva.
    await waitFor(() => expect(screen.getByRole('treeitem', { name: 'Renamed live' })).toBeInTheDocument())
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('ante un error inyectado revierte el nombre y deja el dialog abierto con el error visible', async () => {
    server.use(
      http.patch('/api/v1/me/checklists/:id', async () => {
        // Delay para observar el estado optimista antes del rollback (mismo
        // criterio que useUpdateChecklist.test.tsx).
        await delay(50)
        return HttpResponse.json(
          { error: { code: 'INTERNAL', message: 'Injected failure' } },
          { status: 500 },
        )
      }),
    )
    renderTree()
    const user = await openMenuFor('Completed')
    await user.click(screen.getByRole('menuitem', { name: 'Rename' }))

    const input = await screen.findByLabelText('Name')
    await user.clear(input)
    await user.type(input, 'Should roll back')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    // El dialog (modal) marca el resto de la página `aria-hidden` mientras
    // está abierto (Radix) — y acá se queda abierto todo el tiempo porque la
    // mutación falla — así que hace falta `hidden: true` para seguir viendo
    // el árbol detrás de él.
    await waitFor(() =>
      expect(
        screen.getByRole('treeitem', { name: 'Should roll back', hidden: true }),
      ).toBeInTheDocument(),
    )
    // Rollback: el árbol vuelve al nombre original ...
    await waitFor(() =>
      expect(
        screen.getByRole('treeitem', { name: 'Completed', hidden: true }),
      ).toBeInTheDocument(),
    )
    // ... y el error queda visible en el dialog, que sigue abierto para reintentar.
    expect(await screen.findByRole('alert')).toHaveTextContent('Injected failure')
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })
})

describe('ChecklistNodeMenu — create', () => {
  it('crea una carpeta raíz desde el botón "New list" del header', async () => {
    renderTree()
    const user = userEvent.setup()
    await screen.findByRole('tree')

    await user.click(screen.getByRole('button', { name: 'New list' }))
    const input = await screen.findByLabelText('Name')
    await user.type(input, 'Backlog (root)')
    await user.click(screen.getByRole('button', { name: 'Create' }))

    expect(await screen.findByRole('treeitem', { name: 'Backlog (root)' })).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('crea una sub-lista bajo el nodo del menú', async () => {
    renderTree()
    // "Watching" (1, seed) no tiene sub-carpetas todavía.
    const user = await openMenuFor('Watching')
    await user.click(screen.getByRole('menuitem', { name: 'New sub-list' }))

    const input = await screen.findByLabelText('Name')
    await user.type(input, 'Currently airing')
    await user.click(screen.getByRole('button', { name: 'Create' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())

    // El nodo pasa a tener hijos: hay que expandirlo para ver la sub-lista.
    const parent = await screen.findByRole('treeitem', { name: 'Watching' })
    await waitFor(() => expect(parent).toHaveAttribute('aria-expanded', 'false'))
    parent.focus()
    await user.keyboard('{ArrowRight}')
    expect(await screen.findByRole('treeitem', { name: 'Currently airing' })).toBeInTheDocument()
  })
})

describe('ChecklistNodeMenu — delete', () => {
  it('muestra cuántas sub-listas se van con la cascada, y borra al confirmar', async () => {
    const parent = await listsService.createChecklist({ name: 'Delete cascade parent' })
    await listsService.createChecklist({ name: 'Delete cascade child', parentId: parent.id })
    renderTree()
    const user = await openMenuFor('Delete cascade parent')
    await user.click(screen.getByRole('menuitem', { name: 'Delete' }))

    // 1 sub-lista ("Delete cascade child"); 0 entries (el mock no permite
    // fabricar `linkCount` > 0 vía la API pública — la aritmética completa
    // con entries está cubierta aparte en checklistTree.test.ts).
    await screen.findByRole('dialog')
    expect(
      screen.getByText('This will also delete 1 sub-list. This action cannot be undone.'),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Delete' }))

    await waitFor(() =>
      expect(screen.queryByRole('treeitem', { name: 'Delete cascade parent' })).not.toBeInTheDocument(),
    )
  })

  it('un nodo hoja sin sub-listas ni entries muestra el mensaje de "lista vacía"', async () => {
    await listsService.createChecklist({ name: 'Delete empty leaf' })
    renderTree()
    const user = await openMenuFor('Delete empty leaf')
    await user.click(screen.getByRole('menuitem', { name: 'Delete' }))

    expect(
      await screen.findByText('This list is empty. This action cannot be undone.'),
    ).toBeInTheDocument()
    void user
  })

  it('ante un error inyectado, mantiene el dialog abierto con el error visible', async () => {
    server.use(
      http.delete('/api/v1/me/checklists/:id', async () => {
        await delay(20)
        return HttpResponse.json(
          { error: { code: 'INTERNAL', message: 'Injected delete failure' } },
          { status: 500 },
        )
      }),
    )
    renderTree()
    const user = await openMenuFor('Completed')
    await user.click(screen.getByRole('menuitem', { name: 'Delete' }))
    await screen.findByRole('dialog')

    await user.click(screen.getByRole('button', { name: 'Delete' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Injected delete failure')
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    // El dialog modal marca el resto de la página `aria-hidden` mientras está
    // abierto (Radix): hace falta `hidden: true` para seguir viendo el
    // treeitem detrás de él y confirmar que el nodo no se borró.
    expect(screen.getByRole('treeitem', { name: 'Completed', hidden: true })).toBeInTheDocument()
  })
})

describe('ChecklistNodeMenu — publish toggle', () => {
  it('publica/despublica sin dialog, de forma optimista', async () => {
    renderTree()
    // "Favorites" (3, seed) arranca sin publicar.
    const user = await openMenuFor('Favorites')
    await user.click(screen.getByRole('menuitem', { name: 'Publish' }))

    // Sin dialog de por medio: el menú se cierra y el toggle queda optimista.
    await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument())
    await openMenuFor('Favorites')
    expect(screen.getByRole('menuitem', { name: 'Unpublish' })).toBeInTheDocument()
    void user
  })

  it('ante un error inyectado, revierte el toggle y avisa por toast', async () => {
    server.use(
      http.patch('/api/v1/me/checklists/:id', async () => {
        await delay(20)
        return HttpResponse.json({ error: { code: 'INTERNAL', message: 'boom' } }, { status: 500 })
      }),
    )
    renderTree()
    // "Watching" (1, seed) arranca publicada.
    const user = await openMenuFor('Watching')
    await user.click(screen.getByRole('menuitem', { name: 'Unpublish' }))

    await waitFor(() => expect(toast.error).toHaveBeenCalled())
    // Rollback: reabrir el menú debe seguir ofreciendo "Unpublish" (sigue publicada).
    await openMenuFor('Watching')
    expect(screen.getByRole('menuitem', { name: 'Unpublish' })).toBeInTheDocument()
    void user
  })
})

describe('ChecklistNodeMenu — teclado y accesibilidad', () => {
  // "Watching" (seed, id 1) es siempre el primer nodo raíz visible: gracias a
  // `resetMockDb()` (deuda #7, bitácora 13) cada test de este archivo arranca
  // contra el seed original, así que da igual qué le hicieron los tests de
  // los describe de arriba — acá siempre empieza con el roving tabindex por
  // defecto (`focusedId` inicial = primer nodo visible).
  it('Shift+F10 sobre el nodo con foco abre su menú contextual', async () => {
    renderTree()
    const watching = await screen.findByRole('treeitem', { name: 'Watching' })
    watching.focus()

    fireEvent.keyDown(watching, { key: 'F10', shiftKey: true })

    expect(await screen.findByRole('menu')).toBeInTheDocument()
  })

  it('las flechas dentro del menú abierto no mueven el foco roving-tabindex del árbol', async () => {
    renderTree()
    const user = await openMenuFor('Watching')
    const completed = await screen.findByRole('treeitem', { name: 'Completed', hidden: true })

    // ArrowDown/ArrowUp navegan los ítems del menú (Radix), no el árbol: si
    // el Portal del menú no cortara el burbujeo nativo, esto además movería
    // el roving tabindex a "Completed" (riesgo #2, doc 12 §3.5b).
    await user.keyboard('{ArrowDown}{ArrowDown}')

    expect(screen.getByRole('treeitem', { name: 'Watching', hidden: true })).toHaveAttribute(
      'tabindex',
      '0',
    )
    expect(completed).toHaveAttribute('tabindex', '-1')
  })

  it('Escape cierra el menú y devuelve el foco real de DOM al treeitem de origen', async () => {
    renderTree()
    const user = await openMenuFor('Watching')
    const watching = screen.getByRole('treeitem', { name: 'Watching', hidden: true })

    await user.keyboard('{Escape}')

    await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument())
    await waitFor(() => expect(document.activeElement).toBe(watching))
  })

  it('un click en el trigger del menú no selecciona el nodo', async () => {
    const onSelect = vi.fn()
    renderTree(onSelect)
    const item = await screen.findByRole('treeitem', { name: 'Watching' })
    const trigger = within(item).getByRole('button', { name: 'Actions for Watching' })

    await userEvent.setup().click(trigger)

    expect(onSelect).not.toHaveBeenCalled()
  })
})
