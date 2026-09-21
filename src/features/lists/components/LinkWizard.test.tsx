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
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { server } from '@/mocks/server'
import { LinkWizard } from '@/features/lists/components/LinkWizard'
import { franchises } from '@/mocks/seed/franchises'
import { useSessionStore } from '@/store/sessionStore'
import type { CreateLinkRequest } from '@/features/lists/types'
import type { ContentDetail } from '@/features/catalog/types'
import type { UserSession } from '@/features/auth/types'

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))
import { toast } from 'sonner'

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => {
  server.resetHandlers()
  server.events.removeAllListeners()
})
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

/** Busca en el seed de catálogo el content dueño de una versión. */
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

/** Cuerpos de los `POST /me/links` que salieron, en orden. */
function capturePosts(): CreateLinkRequest[] {
  const bodies: CreateLinkRequest[] = []
  server.events.on('request:start', ({ request }) => {
    if (request.method !== 'POST' || !request.url.includes('/me/links')) return
    // El listener no puede ser `async`: si el test termina con una request en
    // vuelo, ese `json()` rechaza sin nadie que lo espere y el runner lo
    // reporta como unhandled rejection. Con `.then/.catch` el rechazo queda
    // manejado y la captura sigue sirviendo igual.
    void request
      .clone()
      .json()
      .then((body: CreateLinkRequest) => bodies.push(body))
      .catch(() => undefined)
  })
  return bodies
}

function renderWizard(versionId: number) {
  const content = contentOf(versionId)
  const onOpenChange = vi.fn()
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  render(
    <QueryClientProvider client={client}>
      <LinkWizard
        open
        onOpenChange={onOpenChange}
        versions={content.versions}
        versionId={versionId}
        contentNames={content.alternativeNames}
      />
    </QueryClientProvider>,
  )
  return { onOpenChange, user: userEvent.setup() }
}

/** Elige carpeta y manda: el camino común hasta el primer `POST`. */
async function submitInto(
  user: ReturnType<typeof userEvent.setup>,
  listName: string,
) {
  await user.click(await screen.findByRole('treeitem', { name: listName }))
  await user.click(screen.getByRole('button', { name: 'Add' }))
}

describe('LinkWizard', () => {
  it('camino feliz: vincula, cierra y ofrece deshacer', async () => {
    const posts = capturePosts()
    // La versión 1002 no está vinculada en ningún lado del seed.
    const { onOpenChange, user } = renderWizard(1002)

    await submitInto(user, 'Completed')

    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false))
    expect(posts[0]?.checklistId).toBe(2)
    expect(posts[0]?.groupUnderFranchise).toBe(true)
    expect(toast.success).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        action: expect.objectContaining({ label: 'Undo' }),
      }),
    )
  })

  it('el 409 real del mock lleva al paso de conflicto, diciendo en qué lista está', async () => {
    // La versión 1005 ya está en "Watching" por el seed.
    const { user } = renderWizard(1005)

    await submitInto(user, 'Completed')

    // Se busca el cuerpo y no "already in your lists" a secas: ese texto es
    // también el título del paso que anuncia el `aria-live`.
    expect(
      await screen.findByText(/What do you want to do/i),
    ).toBeInTheDocument()
    expect(screen.getByText(/In "Watching"/)).toBeInTheDocument()
  })

  it('camino 1 del conflicto: "add anyway" reintenta con force y vincula', async () => {
    const posts = capturePosts()
    const { onOpenChange, user } = renderWizard(1005)

    await submitInto(user, 'Completed')
    await user.click(await screen.findByRole('button', { name: 'Add anyway' }))

    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false))
    expect(posts).toHaveLength(2)
    expect(posts[0]?.force).toBeUndefined()
    expect(posts[1]?.force).toBe(true)
    // El resto del cuerpo se conserva: no se le vuelve a preguntar al usuario.
    expect(posts[1]?.checklistId).toBe(posts[0]?.checklistId)
  })

  it('camino 2: la copia sincronizada manda el link ELEGIDO, no el primero', async () => {
    const posts = capturePosts()
    // La versión 1016 aparece dos veces en el seed: link 5007 en "Completed"
    // y link 5006 en "2010s". Se elige la segunda a propósito.
    const { onOpenChange, user } = renderWizard(1016)

    await submitInto(user, 'Watching')

    const options = await screen.findAllByRole('radio')
    expect(options).toHaveLength(2)
    await user.click(screen.getByRole('radio', { name: /In "2010s"/ }))
    await user.click(screen.getByRole('button', { name: 'Create synced copy' }))

    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false))
    expect(posts[1]?.syncWithLinkId).toBe(5006)
  })

  it('camino 3: cancelar cierra sin crear nada más', async () => {
    const posts = capturePosts()
    const { onOpenChange, user } = renderWizard(1005)

    await submitInto(user, 'Completed')
    // El Cancel del paso anterior existe igual, pero deshabilitado mientras el
    // POST está en vuelo: hay que esperar al paso de conflicto de verdad.
    await screen.findByText(/What do you want to do/i)
    await user.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(onOpenChange).toHaveBeenCalledWith(false)
    expect(posts).toHaveLength(1)
  })

  it('si el payload del 409 no valida, degrada: conflicto sin lista, sin sincronizar', async () => {
    const { user } = renderWizard(1005)
    const { http, HttpResponse } = await import('msw')
    server.use(
      http.post('/api/v1/me/links', () =>
        HttpResponse.json(
          {
            error: {
              code: 'ALREADY_LINKED',
              message: 'nope',
              existing: [{ garbage: true }],
            },
          },
          { status: 409 },
        ),
      ),
    )

    await submitInto(user, 'Completed')

    expect(
      await screen.findByText(/already in one of your lists/i),
    ).toBeInTheDocument()
    expect(screen.queryByRole('radio')).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Create synced copy' }),
    ).not.toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Add anyway' }),
    ).toBeInTheDocument()
  })

  it('no manda nada si no se eligió carpeta', async () => {
    const posts = capturePosts()
    const { user } = renderWizard(1002)

    await screen.findByRole('tree')
    await user.click(screen.getByRole('button', { name: 'Add' }))

    expect(await screen.findByText('Pick a list first')).toBeInTheDocument()
    expect(posts).toHaveLength(0)
  })
})
