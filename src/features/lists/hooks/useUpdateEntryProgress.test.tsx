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
import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { http, HttpResponse, delay } from 'msw'
import type { ReactNode } from 'react'
import { server } from '@/mocks/server'
import { useUpdateEntryProgress } from '@/features/lists/hooks/useUpdateEntryProgress'
import { listKeys } from '@/features/lists/hooks/queryKeys'
import { useSessionStore } from '@/store/sessionStore'
import type { ListEntry, VersionEntry } from '@/features/lists/types'
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

const CHECKLIST_ID = 1

/** Espejo del entry suelto "Demon Slayer" del seed (linkId 5000). */
function looseEntry(
  overrides: Partial<VersionEntry['version']> = {},
): VersionEntry {
  return {
    linkId: 5000,
    kind: 'version',
    displayName: 'Demon Slayer — Season 1',
    imageUrl: null,
    order: 0,
    contentType: 'V',
    franchiseId: 3,
    notes: null,
    version: {
      versionId: 1005,
      contentId: 104,
      abbreviation: 'KnY',
      watchedEpisodes: 12,
      totalEpisodes: 26,
      isSynced: false,
      ...overrides,
    },
  }
}

/** Espejo del grupo "Spy x Family" del seed: 5001 con los hijos 5002 y 5003. */
function groupedEntries(): ListEntry[] {
  const child = (
    linkId: number,
    abbreviation: string,
    watched: number,
  ): VersionEntry => ({
    linkId,
    kind: 'version',
    displayName: abbreviation === 'S1' ? 'Season 1' : 'Season 2',
    imageUrl: null,
    order: 0,
    contentType: 'V',
    franchiseId: 10,
    notes: null,
    version: {
      versionId: linkId,
      contentId: 113,
      abbreviation,
      watchedEpisodes: watched,
      totalEpisodes: abbreviation === 'S1' ? 25 : 0,
      isSynced: false,
    },
  })
  const children = [child(5002, 'S1', 25), child(5003, 'S2', 3)]
  return [
    {
      linkId: 5001,
      kind: 'franchise',
      displayName: 'Spy x Family',
      imageUrl: null,
      order: 1,
      contentType: 'V',
      franchiseId: 10,
      notes: null,
      showProgress: true,
      childEntries: children,
      aggregatedProgress: {
        groups: [
          { abbreviation: 'S1', watched: 25, total: 25 },
          { abbreviation: 'S2', watched: 3, total: 0 },
        ],
      },
    },
  ]
}

function setup(entry: VersionEntry, seed: ListEntry[]) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  client.setQueryData(listKeys.entries(CHECKLIST_ID), seed)
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>
  }
  const hook = renderHook(() => useUpdateEntryProgress(CHECKLIST_ID, entry), {
    wrapper: Wrapper,
  })
  return { client, hook }
}

function entriesInCache(client: QueryClient): ListEntry[] {
  return client.getQueryData<ListEntry[]>(listKeys.entries(CHECKLIST_ID)) ?? []
}

describe('useUpdateEntryProgress', () => {
  it('escribe el cache al instante, antes de que salga el PATCH', async () => {
    const entry = looseEntry()
    const { client, hook } = setup(entry, [entry])

    act(() => hook.result.current.setProgress(13))

    // Sin esperar nada: el feedback no puede depender de la red.
    expect(entriesInCache(client)[0]?.version?.watchedEpisodes).toBe(13)
  })

  it('CA: corte de red ⇒ rollback al valor previo y toast de error', async () => {
    server.use(http.patch('/api/v1/me/links/:id', () => HttpResponse.error()))
    const entry = looseEntry()
    const { client, hook } = setup(entry, [entry])

    act(() => hook.result.current.setProgress(13))
    expect(entriesInCache(client)[0]?.version?.watchedEpisodes).toBe(13)

    await waitFor(() => {
      expect(entriesInCache(client)[0]?.version?.watchedEpisodes).toBe(12)
    })
    expect(toast.error).toHaveBeenCalledWith(
      'Could not save your progress. Try again.',
    )
  })

  it('revierte al valor del PRIMER click de la ráfaga, no al intermedio', async () => {
    server.use(http.patch('/api/v1/me/links/:id', () => HttpResponse.error()))
    const entry = looseEntry()
    const { client, hook } = setup(entry, [entry])

    act(() => {
      hook.result.current.setProgress(13)
      hook.result.current.setProgress(14)
      hook.result.current.setProgress(15)
    })

    await waitFor(() => {
      expect(entriesInCache(client)[0]?.version?.watchedEpisodes).toBe(12)
    })
  })

  it('una ráfaga entera se commitea con un solo PATCH, con el valor final', async () => {
    const seen: string[] = []
    server.events.on('request:start', ({ request }) => {
      if (request.method === 'PATCH') seen.push(request.url)
    })

    const entry = looseEntry()
    const { hook } = setup(entry, [entry])

    act(() => {
      for (const value of [13, 14, 15, 16, 17])
        hook.result.current.setProgress(value)
    })

    await waitFor(() => expect(seen).toHaveLength(1))
    // Se deja correr un poco más para confirmar que no llega ninguno atrasado.
    await new Promise((resolve) => setTimeout(resolve, 200))
    expect(seen).toHaveLength(1)
    server.events.removeAllListeners()
  })

  it('con el PATCH más lento que el debounce, el rollback vuelve al valor previo a TODA la ráfaga', async () => {
    // El escenario que rompía la contabilidad de snapshots: mientras el primer
    // commit sigue en vuelo entran más clicks. Antes el segundo commit se
    // encolaba sin haber corrido su `onMutate`, así que el tercer click no
    // tomaba snapshot nuevo y el rollback podía dejar un valor intermedio —o
    // ninguno— en pantalla. Contra MSW no se alcanza (el PATCH mockeado tarda
    // 150 ms y el debounce son 400), así que la lentitud se inyecta acá.
    server.use(
      http.patch('/api/v1/me/links/:id', async () => {
        await delay(700)
        return HttpResponse.error()
      }),
    )
    const entry = looseEntry()
    const { client, hook } = setup(entry, [entry])

    act(() => hook.result.current.setProgress(13))
    await new Promise((resolve) => setTimeout(resolve, 500))
    act(() => hook.result.current.setProgress(14))
    await new Promise((resolve) => setTimeout(resolve, 500))
    act(() => hook.result.current.setProgress(15))

    await waitFor(
      () =>
        expect(entriesInCache(client)[0]?.version?.watchedEpisodes).toBe(12),
      { timeout: 4000 },
    )
    expect(toast.error).toHaveBeenCalled()
  }, 10000)

  it('desmontar con un commit pendiente lo manda igual, no lo descarta', async () => {
    const seen: string[] = []
    server.events.on('request:start', ({ request }) => {
      if (request.method === 'PATCH') seen.push(request.url)
    })

    const entry = looseEntry()
    const { hook } = setup(entry, [entry])
    act(() => hook.result.current.setProgress(13))
    // Antes de que venza el debounce: el episodio que el usuario ya vio subir
    // no puede perderse porque cambió de carpeta.
    hook.unmount()

    await waitFor(() => expect(seen).toHaveLength(1))
    server.events.removeAllListeners()
  })

  it('CA extra: subir un hijo mueve el agregado del padre en el mismo frame', () => {
    const seed = groupedEntries()
    const child = seed[0]?.childEntries?.[1]
    if (!child?.version) throw new Error('fixture inválida')
    const { client, hook } = setup(child as VersionEntry, seed)

    act(() => hook.result.current.setProgress(4))

    const groups = entriesInCache(client)[0]?.aggregatedProgress?.groups
    expect(groups?.[1]).toEqual({ abbreviation: 'S2', watched: 4, total: 0 })
    // El otro grupo no se toca: la mutación solo puede mover uno (ADR-021).
    expect(groups?.[0]).toEqual({ abbreviation: 'S1', watched: 25, total: 25 })
  })

  it('CA extra: un entry sincronizado invalida el prefijo entero, no solo su carpeta', async () => {
    const entry = looseEntry({ isSynced: true })
    const { client, hook } = setup(entry, [entry])
    // Otra carpeta ya en cache: es la que podría quedar mintiendo.
    client.setQueryData(listKeys.entries(6), [])
    client.setQueryData(listKeys.tree(), [])

    act(() => hook.result.current.setProgress(13))

    await waitFor(() => {
      expect(client.getQueryState(listKeys.entries(6))?.isInvalidated).toBe(
        true,
      )
    })
  })

  it('un entry NO sincronizado no invalida el árbol: linkCount no cambió', async () => {
    const entry = looseEntry()
    const { client, hook } = setup(entry, [entry])
    client.setQueryData(listKeys.tree(), [])
    client.setQueryData(listKeys.libraryIndex(), {
      versionIds: [],
      franchiseIds: [],
    })

    act(() => hook.result.current.setProgress(13))

    await waitFor(() => {
      expect(
        client.getQueryState(listKeys.entries(CHECKLIST_ID))?.isInvalidated,
      ).toBe(true)
    })
    expect(client.getQueryState(listKeys.tree())?.isInvalidated).toBe(false)
    expect(client.getQueryState(listKeys.libraryIndex())?.isInvalidated).toBe(
      false,
    )
  })
})
