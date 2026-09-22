import { describe, it, expect, beforeAll, beforeEach, afterEach, afterAll, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { server } from '@/mocks/server'
import { ChecklistTree } from '@/features/lists/components/ChecklistTree'
import { useSessionStore } from '@/store/sessionStore'
import { authService } from '@/features/auth/services/auth.service'
import { STARTER_LIST_KEYS } from '@/features/lists/constants'
import { t } from '@/i18n/en'
import type { UserSession } from '@/features/auth/types'

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

// Usuario 1 del seed (src/mocks/seed/lists.ts): Watching (1), Completed (2),
// Favorites (3) > All-time (4) — el único nodo anidado, clave para probar
// expand/collapse y la revelación automática por selección de URL.
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

function renderTree(selectedId: number | null = null) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const onSelect = vi.fn()
  render(
    <QueryClientProvider client={client}>
      <ChecklistTree selectedId={selectedId} onSelect={onSelect} />
    </QueryClientProvider>,
  )
  return { onSelect }
}

describe('ChecklistTree', () => {
  it('renderiza el árbol con role="tree" y los nodos raíz del seed', async () => {
    renderTree()

    expect(await screen.findByRole('tree')).toBeInTheDocument()
    expect(screen.getByRole('treeitem', { name: 'Watching' })).toBeInTheDocument()
    expect(screen.getByRole('treeitem', { name: 'Completed' })).toBeInTheDocument()
    expect(screen.getByRole('treeitem', { name: 'Favorites' })).toBeInTheDocument()
    // "All-time" está anidado bajo "Favorites", que arranca colapsado.
    expect(screen.queryByRole('treeitem', { name: 'All-time' })).not.toBeInTheDocument()
  })

  it('solo un ítem tiene tabIndex=0 (roving tabindex) y arranca en el primer nodo', async () => {
    renderTree()
    await screen.findByRole('tree')

    const items = screen.getAllByRole('treeitem')
    const tabbable = items.filter((el) => el.getAttribute('tabindex') === '0')
    expect(tabbable).toHaveLength(1)
    expect(tabbable[0]).toHaveAccessibleName('Watching')
  })

  it('ArrowDown/ArrowUp mueven el foco real del DOM entre nodos visibles', async () => {
    const user = userEvent.setup()
    renderTree()
    const watching = await screen.findByRole('treeitem', { name: 'Watching' })
    watching.focus()
    expect(document.activeElement).toBe(watching)

    await user.keyboard('{ArrowDown}')
    const completed = screen.getByRole('treeitem', { name: 'Completed' })
    expect(document.activeElement).toBe(completed)
    expect(completed).toHaveAttribute('tabindex', '0')
    expect(watching).toHaveAttribute('tabindex', '-1')

    await user.keyboard('{ArrowUp}')
    expect(document.activeElement).toBe(watching)
  })

  it('ArrowRight expande sin mover el foco; una segunda vez baja al primer hijo', async () => {
    const user = userEvent.setup()
    renderTree()
    const favorites = await screen.findByRole('treeitem', { name: 'Favorites' })
    favorites.focus()

    expect(favorites).toHaveAttribute('aria-expanded', 'false')

    await user.keyboard('{ArrowRight}')
    expect(favorites).toHaveAttribute('aria-expanded', 'true')
    expect(document.activeElement).toBe(favorites) // primer ArrowRight solo expande

    const allTime = await screen.findByRole('treeitem', { name: 'All-time' })
    await user.keyboard('{ArrowRight}')
    expect(document.activeElement).toBe(allTime)
  })

  it('ArrowLeft colapsa un nodo abierto; en un hijo, sube al padre', async () => {
    const user = userEvent.setup()
    renderTree()
    const favorites = await screen.findByRole('treeitem', { name: 'Favorites' })
    favorites.focus()
    await user.keyboard('{ArrowRight}') // expande
    const allTime = screen.getByRole('treeitem', { name: 'All-time' })
    await user.keyboard('{ArrowRight}') // baja al hijo
    expect(document.activeElement).toBe(allTime)

    await user.keyboard('{ArrowLeft}') // "All-time" no tiene hijos -> sube al padre
    expect(document.activeElement).toBe(favorites)
    expect(favorites).toHaveAttribute('aria-expanded', 'true')

    await user.keyboard('{ArrowLeft}') // "Favorites" abierto -> colapsa, sin mover foco
    expect(favorites).toHaveAttribute('aria-expanded', 'false')
    expect(document.activeElement).toBe(favorites)
    expect(screen.queryByRole('treeitem', { name: 'All-time' })).not.toBeInTheDocument()
  })

  it('Home/End van al primer y último nodo visible', async () => {
    const user = userEvent.setup()
    renderTree()
    const watching = await screen.findByRole('treeitem', { name: 'Watching' })
    const favorites = screen.getByRole('treeitem', { name: 'Favorites' })
    favorites.focus()

    await user.keyboard('{Home}')
    expect(document.activeElement).toBe(watching)

    await user.keyboard('{End}')
    expect(document.activeElement).toBe(favorites) // colapsado: último visible es "Favorites"
  })

  it('Enter selecciona el nodo con foco y notifica al caller', async () => {
    const user = userEvent.setup()
    const { onSelect } = renderTree()
    const completed = await screen.findByRole('treeitem', { name: 'Completed' })
    completed.focus()

    await user.keyboard('{Enter}')
    expect(onSelect).toHaveBeenCalledWith(2)
  })

  it('un click selecciona el nodo sin togglear expand/collapse', async () => {
    const user = userEvent.setup()
    const { onSelect } = renderTree()
    const favorites = await screen.findByRole('treeitem', { name: 'Favorites' })

    await user.click(favorites)
    expect(onSelect).toHaveBeenCalledWith(3)
    expect(favorites).toHaveAttribute('aria-expanded', 'false')
  })

  it('con un nodo anidado seleccionado por URL, revela sus ancestros y marca aria-selected', async () => {
    renderTree(4) // "All-time", anidado bajo "Favorites"

    const allTime = await screen.findByRole('treeitem', { name: 'All-time' })
    const favorites = screen.getByRole('treeitem', { name: 'Favorites' })

    expect(favorites).toHaveAttribute('aria-expanded', 'true')
    expect(allTime).toHaveAttribute('aria-selected', 'true')
    // El foco roving-tabindex también arranca en el nodo seleccionado por la
    // URL, no en el primer nodo del árbol — así Tab entra directo ahí tras un refresh.
    expect(allTime).toHaveAttribute('tabindex', '0')
  })

  it('un cambio de selección posterior a una carpeta anidada colapsada también revela sus ancestros', async () => {
    // Antes, `autoExpandedFor` era un booleano de "una sola vez en la vida":
    // el primer montaje con "Watching" (1, sin ancestros) ya lo marcaba, y una
    // selección posterior a "2010s" (6) —cuatro niveles bajo "Favorites" (3) >
    // "All-time" (4) > "By decade" (5), todas colapsadas— dejaba de revelarse.
    // Esto reproduce exactamente ese cambio: back/forward del navegador sobre
    // el mismo `<ChecklistTree>` montado, no un refresh.
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const onSelect = vi.fn()
    const { rerender } = render(
      <QueryClientProvider client={client}>
        <ChecklistTree selectedId={1} onSelect={onSelect} />
      </QueryClientProvider>,
    )
    await screen.findByRole('treeitem', { name: 'Watching' })
    expect(screen.getByRole('treeitem', { name: 'Favorites' })).toHaveAttribute(
      'aria-expanded',
      'false',
    )

    rerender(
      <QueryClientProvider client={client}>
        <ChecklistTree selectedId={6} onSelect={onSelect} />
      </QueryClientProvider>,
    )

    const target = await screen.findByRole('treeitem', { name: '2010s' })
    expect(target).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('treeitem', { name: 'Favorites' })).toHaveAttribute(
      'aria-expanded',
      'true',
    )
    expect(screen.getByRole('treeitem', { name: 'All-time' })).toHaveAttribute(
      'aria-expanded',
      'true',
    )
    expect(screen.getByRole('treeitem', { name: 'By decade' })).toHaveAttribute(
      'aria-expanded',
      'true',
    )
  })

  it('estado vacío: el usuario sin listas ve el CTA de starter lists (doc 12 §3.5c), no un árbol vacío', async () => {
    // Usuario nuevo registrado en el momento (id `Date.now()`, sin
    // checklists), no `sam@example.com` fijo del seed: el seed es mutable a
    // nivel de módulo sin reset entre tests (hallazgo #7, bitácora 13), y
    // este archivo ya corrió mutaciones (clicks de árbol) antes de llegar
    // acá — depender de un id fijo haría el resultado sensible al orden de
    // ejecución dentro del archivo.
    const user = await authService.register({
      name: 'Onboarding Tester',
      email: `onboarding-${Date.now()}@example.com`,
      password: 'password123',
    })
    useSessionStore.setState({ user, status: 'authenticated' })

    renderTree()

    // Espera a que la carga real termine (no solo a que "tree" esté ausente
    // en el primer render, que también es cierto durante el skeleton).
    const cta = await screen.findByRole('button', {
      name: t.lists.starterListsPrompt.cta,
    })
    expect(screen.queryByRole('tree')).not.toBeInTheDocument()

    const author = userEvent.setup()
    await author.click(cta)

    // Las cinco aparecen, en el orden de STARTER_LIST_KEYS, y el CTA ya no
    // está (CA: "el CTA no vuelve a aparecer") — es el árbol tomando la
    // rama `else` de `ChecklistTree` en cuanto `tree.length > 0`. Timeout
    // extendido: cinco POST secuenciales de 300ms (~1.5s) superan el
    // default de `findByRole` (1s).
    const tree = await screen.findByRole('tree', undefined, { timeout: 4000 })
    STARTER_LIST_KEYS.forEach((key) => {
      expect(
        within(tree).getByRole('treeitem', { name: t.lists.starterLists[key] }),
      ).toBeInTheDocument()
    })
    expect(
      screen.queryByRole('button', { name: t.lists.starterListsPrompt.cta }),
    ).not.toBeInTheDocument()
  }, 8000)
})
