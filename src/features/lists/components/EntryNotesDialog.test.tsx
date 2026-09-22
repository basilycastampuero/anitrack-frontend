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
import { http, HttpResponse } from 'msw'
import type { ReactNode } from 'react'
import { server } from '@/mocks/server'
import { EntryNotesDialog } from '@/features/lists/components/EntryNotesDialog'
import { listKeys } from '@/features/lists/hooks/queryKeys'
import { features } from '@/lib/features'
import { useSessionStore } from '@/store/sessionStore'
import type {
  ListEntry,
  UpdateLinkRequest,
  VersionEntry,
} from '@/features/lists/types'
import type { UserSession } from '@/features/auth/types'

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))
import { toast } from 'sonner'

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => {
  server.resetHandlers()
  server.events.removeAllListeners()
  // Los flags son un objeto mutable a propósito (doc 15 §4.6): así un test
  // puede apagarlos sin `vi.mock` del módulo entero. Se reponen siempre.
  features.ratings = true
  features.watchDates = true
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

const CHECKLIST_ID = 1

/** Espejo del entry "Demon Slayer" del seed (linkId 5000, carpeta 1). */
const entry: VersionEntry = {
  linkId: 5000,
  kind: 'version',
  displayName: 'Demon Slayer — Season 1',
  imageUrl: null,
  order: 0,
  contentType: 'V',
  franchiseId: 3,
  notes: 'Ufotable animation is unreal.',
  rating: 9,
  startedAt: '2024-01-05',
  finishedAt: null,
  version: {
    versionId: 1005,
    contentId: 104,
    abbreviation: 'KnY',
    watchedEpisodes: 12,
    totalEpisodes: 26,
    isSynced: false,
  },
}

/** Cuerpos de los `PATCH /me/links/:id` que salieron, en orden. */
function capturePatches(): UpdateLinkRequest[] {
  const bodies: UpdateLinkRequest[] = []
  server.events.on('request:start', ({ request }) => {
    if (request.method !== 'PATCH' || !request.url.includes('/me/links/'))
      return
    void request
      .clone()
      .json()
      .then((body: UpdateLinkRequest) => bodies.push(body))
      .catch(() => undefined)
  })
  return bodies
}

function renderDialog() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  client.setQueryData(listKeys.entries(CHECKLIST_ID), [entry])
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>
  }
  render(
    <EntryNotesDialog
      open
      onOpenChange={vi.fn()}
      entry={entry}
      checklistId={CHECKLIST_ID}
    />,
    { wrapper: Wrapper },
  )
  return { client, user: userEvent.setup() }
}

function entriesInCache(client: QueryClient): ListEntry[] {
  return client.getQueryData<ListEntry[]>(listKeys.entries(CHECKLIST_ID)) ?? []
}

describe('EntryNotesDialog', () => {
  it('con el flag encendido muestra las estrellas y manda el puntaje', async () => {
    const patches = capturePatches()
    const { user } = renderDialog()

    expect(
      screen.getByRole('radiogroup', { name: 'Your rating' }),
    ).toBeInTheDocument()
    await user.click(screen.getByRole('radio', { name: '7 out of 10' }))
    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(patches).toHaveLength(1))
    expect(patches[0]?.rating).toBe(7)
  })

  it('CA: con el flag apagado no hay ni rastro de estrellas en la UI', () => {
    features.ratings = false
    renderDialog()

    expect(screen.queryByRole('radiogroup')).not.toBeInTheDocument()
    expect(screen.queryByRole('radio')).not.toBeInTheDocument()
    expect(screen.queryByText('Your rating')).not.toBeInTheDocument()
  })

  it('CA: con los flags apagados el body del PATCH no lleva rating ni fechas', async () => {
    features.ratings = false
    features.watchDates = false
    const patches = capturePatches()
    const { user } = renderDialog()

    await user.clear(screen.getByLabelText('Notes'))
    await user.type(screen.getByLabelText('Notes'), 'Rewatched it')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(patches).toHaveLength(1))
    const body = patches[0] ?? {}
    // No basta con no renderizar el control: el campo tampoco puede viajar.
    expect('rating' in body).toBe(false)
    expect('startedAt' in body).toBe(false)
    expect('finishedAt' in body).toBe(false)
    expect(body.notes).toBe('Rewatched it')
  })

  it('las notas NO dependen de ningún flag: existen en el backend real', async () => {
    features.ratings = false
    features.watchDates = false
    renderDialog()

    expect(screen.getByLabelText('Notes')).toBeInTheDocument()
    expect(screen.getByLabelText('Notes')).toHaveValue(
      'Ufotable animation is unreal.',
    )
  })

  it('escribe el cache antes de que resuelva el PATCH', async () => {
    const { client, user } = renderDialog()

    await user.clear(screen.getByLabelText('Notes'))
    await user.type(screen.getByLabelText('Notes'), 'Nueva nota')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => {
      expect(entriesInCache(client)[0]?.notes).toBe('Nueva nota')
    })
  })

  it('ante un fallo revierte y avisa con un toast', async () => {
    server.use(http.patch('/api/v1/me/links/:id', () => HttpResponse.error()))
    const { client, user } = renderDialog()

    await user.clear(screen.getByLabelText('Notes'))
    await user.type(screen.getByLabelText('Notes'), 'No se va a guardar')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => {
      expect(entriesInCache(client)[0]?.notes).toBe(
        'Ufotable animation is unreal.',
      )
    })
    expect(toast.error).toHaveBeenCalledWith(
      'Could not save the changes. Try again.',
    )
  })
})
