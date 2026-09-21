import {
  describe,
  it,
  expect,
  beforeAll,
  beforeEach,
  afterEach,
  afterAll,
  vi,
} from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { server } from '@/mocks/server'
import { AddToListButton } from '@/features/lists/components/AddToListButton'
import { franchises } from '@/mocks/seed/franchises'
import { useSessionStore } from '@/store/sessionStore'
import type { ContentDetail } from '@/features/catalog/types'
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

function contentOf(versionId: number): ContentDetail {
  for (const franchise of franchises) {
    for (const content of [
      ...franchise.gameContents,
      ...franchise.videoContents,
    ]) {
      if (content.versions.some((version) => version.id === versionId))
        return content
    }
  }
  throw new Error(
    `fixture inválida: la versión ${versionId} no está en el seed`,
  )
}

function renderButton(versionId: number) {
  const content = contentOf(versionId)
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  render(
    <QueryClientProvider client={client}>
      <AddToListButton
        versions={content.versions}
        versionId={versionId}
        contentNames={content.alternativeNames}
      />
    </QueryClientProvider>,
  )
  return userEvent.setup()
}

/** Dispara el "deshacer" del toast, que es la acción que sonner renderiza. */
async function clickUndoFromToast() {
  const call = vi.mocked(toast.success).mock.calls[0]
  const options = call?.[1] as { action?: { onClick: () => void } } | undefined
  if (!options?.action) throw new Error('el toast no ofreció deshacer')
  await act(async () => {
    options.action!.onClick()
  })
}

describe('AddToListButton — indicador "in your list" (3.9)', () => {
  it('una versión ya vinculada arranca mostrando "In your list"', async () => {
    // La versión 1005 está en "Watching" por el seed.
    renderButton(1005)
    expect(
      await screen.findByRole('button', { name: /In your list/ }),
    ).toBeInTheDocument()
  })

  it('CA: al vincular, el indicador aparece sin recargar; al deshacer, desaparece', async () => {
    // La versión 1002 no está vinculada en ningún lado del seed.
    const user = renderButton(1002)

    const trigger = await screen.findByRole('button', { name: /Add to list/ })
    await user.click(trigger)

    await user.click(await screen.findByRole('treeitem', { name: 'Completed' }))
    await user.click(screen.getByRole('button', { name: 'Add' }))

    // El botón cambia solo: `useCreateLink` invalida `libraryIndex()` y el
    // indicador se repinta sin que nadie recargue la página.
    expect(
      await screen.findByRole('button', { name: /In your list/ }),
    ).toBeInTheDocument()

    await clickUndoFromToast()

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /Add to list/ }),
      ).toBeInTheDocument()
    })
  })

  it('sin sesión no consulta el índice y no muestra el indicador', async () => {
    useSessionStore.setState({ user: null, status: 'unauthenticated' })
    renderButton(1005)

    expect(
      await screen.findByRole('button', { name: /Add to list/ }),
    ).toBeInTheDocument()
  })
})
