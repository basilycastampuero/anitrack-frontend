import { describe, it, expect, beforeAll, afterEach, afterAll, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { server } from '@/mocks/server'
import { useCreateStarterLists } from '@/features/lists/hooks/useCreateStarterLists'
import { useChecklists } from '@/features/lists/hooks/useChecklists'
import { listKeys } from '@/features/lists/hooks/queryKeys'
import { listsService } from '@/features/lists/services/lists.service'
import { authService } from '@/features/auth/services/auth.service'
import { STARTER_LIST_KEYS } from '@/features/lists/constants'
import { useSessionStore } from '@/store/sessionStore'
import { ApiError } from '@/types/api.types'
import { t } from '@/i18n/en'

/**
 * Usuario 2 del seed (`sam@example.com`, mocks/seed/lists.ts) arranca sin
 * checklists (`checklistsByUser[2] = []`). Antes se registraba un usuario
 * nuevo con email random (`Date.now()`/`Math.random()`) porque el seed era
 * estado mutable sin reset entre tests (hallazgo #7, bitácora 13) y este
 * archivo crea varias veces las cinco listas — reusar el mismo id se
 * arriesgaba a heredar lo que dejó el test anterior. Con `resetMockDb()`
 * (`src/mocks/reset.ts`, enganchado global en `src/test/setup.ts`) el seed
 * vuelve a su estado original en cada test, así que alcanza con loguear al
 * usuario 2 real vía `POST /auth/login` (que fija `currentUserId` del lado
 * del mock) en vez de inventar uno.
 */
async function loginAsEmptyUser() {
  const user = await authService.login({ login: 'sam@example.com', password: 'password123' })
  useSessionStore.setState({ user, status: 'authenticated' })
  return user
}

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => {
  server.resetHandlers()
  // Ambos tests reemplazan `listsService.createChecklist` con `vi.spyOn` para
  // observar (o interrumpir) las llamadas — sin restaurar, el segundo test
  // heredaría el mock del primero en vez de partir del service real.
  vi.restoreAllMocks()
})
afterAll(() => server.close())

function wrapper(client: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>
  }
}

describe('useCreateStarterLists', () => {
  it('crea las cinco listas EN SECUENCIA (nunca en paralelo) e invalida tree() una sola vez', async () => {
    await loginAsEmptyUser()
    const client = new QueryClient()

    // Envuelve el service real para detectar solapamiento: si dos POST
    // estuvieran en vuelo a la vez, `maxInFlight` subiría a 2+. Es más
    // robusto que comparar timestamps porque no depende de cuánto tarda el
    // delay simulado de MSW.
    const realCreate = listsService.createChecklist.bind(listsService)
    let inFlight = 0
    let maxInFlight = 0
    const createSpy = vi
      .spyOn(listsService, 'createChecklist')
      .mockImplementation(async (body) => {
        inFlight += 1
        maxInFlight = Math.max(maxInFlight, inFlight)
        try {
          return await realCreate(body)
        } finally {
          inFlight -= 1
        }
      })
    const invalidateSpy = vi.spyOn(client, 'invalidateQueries')

    const { result } = renderHook(
      () => ({ tree: useChecklists(), create: useCreateStarterLists() }),
      { wrapper: wrapper(client) },
    )

    await waitFor(() => expect(result.current.tree.data).toEqual([]))

    result.current.create.mutate()
    // Cinco POST secuenciales de 300ms cada uno (~1.5s) superan el timeout
    // por defecto de `waitFor` (1s): sin extenderlo, el test fallaría por
    // impaciencia, no porque el hook esté mal.
    await waitFor(() => expect(result.current.create.isSuccess).toBe(true), {
      timeout: 4000,
    })

    expect(maxInFlight).toBe(1)
    expect(createSpy).toHaveBeenCalledTimes(STARTER_LIST_KEYS.length)
    // Los nombres se mandan en el orden de STARTER_LIST_KEYS, no alfabético
    // ni cualquier otro: es lo que fija el `order` final en el backend.
    expect(createSpy.mock.calls.map(([body]) => body.name)).toEqual(
      STARTER_LIST_KEYS.map((key) => t.lists.starterLists[key]),
    )

    const treeInvalidations = invalidateSpy.mock.calls.filter(
      ([opts]) => JSON.stringify(opts?.queryKey) === JSON.stringify(listKeys.tree()),
    )
    expect(treeInvalidations).toHaveLength(1)

    await waitFor(
      () => {
        expect(result.current.tree.data).toHaveLength(STARTER_LIST_KEYS.length)
      },
      { timeout: 4000 },
    )
    expect(result.current.tree.data?.map((node) => node.name)).toEqual(
      STARTER_LIST_KEYS.map((key) => t.lists.starterLists[key]),
    )
    result.current.tree.data?.forEach((node, index) => expect(node.order).toBe(index))
  }, 8000)

  it('si una falla a mitad de camino, no revierte lo ya creado y el árbol conserva esas listas', async () => {
    await loginAsEmptyUser()
    const client = new QueryClient()

    const realCreate = listsService.createChecklist.bind(listsService)
    let callCount = 0
    vi.spyOn(listsService, 'createChecklist').mockImplementation(async (body) => {
      callCount += 1
      // Falla justo en la tercera ("On Hold"): ni la primera (nada creado
      // todavía) ni la última (el caso "éxito total" ya está cubierto arriba).
      if (callCount === 3) {
        throw new ApiError('INTERNAL', 'Injected failure', 500)
      }
      return realCreate(body)
    })

    const { result } = renderHook(
      () => ({ tree: useChecklists(), create: useCreateStarterLists() }),
      { wrapper: wrapper(client) },
    )

    await waitFor(() => expect(result.current.tree.data).toEqual([]))

    result.current.create.mutate()
    // Dos POSTs reales de 300ms + la tercera que rechaza: alcanza con menos
    // margen que el caso de éxito, pero se mantiene el mismo timeout extendido
    // por consistencia con el resto del archivo.
    await waitFor(() => expect(result.current.create.isError).toBe(true), {
      timeout: 4000,
    })

    // Se detiene en la que falló: nunca llega a pedir la cuarta ni la quinta.
    expect(callCount).toBe(3)

    // El árbol se invalida igual (onSettled corre en error también) y queda
    // con las dos que sí se pudieron crear — no se revierten.
    await waitFor(
      () => {
        expect(result.current.tree.data).toHaveLength(2)
      },
      { timeout: 4000 },
    )
    expect(result.current.tree.data?.map((node) => node.name)).toEqual([
      t.lists.starterLists.watching,
      t.lists.starterLists.completed,
    ])
  }, 8000)
})
