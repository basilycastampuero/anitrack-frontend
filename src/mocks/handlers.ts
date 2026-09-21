import { http, HttpResponse, delay } from 'msw'
import type { ApiErrorCode } from '@/types/api.types'
import type { CatalogFilters } from '@/features/catalog/types'
import type {
  ChecklistNode,
  CreateLinkRequest,
  ListEntry,
  UpdateChecklistRequest,
  UpdateLinkRequest,
} from '@/features/lists/types'
import { genres, platforms, companies } from '@/mocks/seed/masters'
import { franchises, allContents } from '@/mocks/seed/franchises'
import { filterFranchises, searchHits } from '@/mocks/seed/derive'
import type { UserSession } from '@/features/auth/types'
import {
  users,
  mockCredentials,
  checklistsByUser,
  entriesByChecklist,
  profilesByUser,
  type SeedChecklistNode,
} from '@/mocks/seed/lists'
import {
  aggregateProgress,
  collectSubtreeIds,
  findSiblings,
  computeStats,
  deriveLibraryIndex,
  findAltName,
  findChecklist,
  locateEntries,
  publishedForest,
  removeChecklist,
  resolveVersion,
  toChecklistTree,
} from '@/mocks/derive/lists'

const BASE = '/api/v1'
const url = (path: string) => `${BASE}${path}`

/** Sesión mock en memoria. Default: usuario 1 logueado (mejor demo). */
const DEFAULT_MOCK_USER_ID = 1
let currentUserId: number | null = DEFAULT_MOCK_USER_ID

/**
 * Restaura la sesión mock al usuario logueado por default. `currentUserId` es
 * estado mutable a nivel de módulo (deuda #7, bitácora 13): sin esto, un test
 * que hace login/logout/register queda "logueado" para el resto de los tests
 * del mismo archivo. Se usa junto a `resetListsSeed` desde `@/mocks/reset`.
 */
export function resetMockSession(): void {
  currentUserId = DEFAULT_MOCK_USER_ID
  nextLinkId = FIRST_LINK_ID
}

const STATUS_BY_CODE: Record<ApiErrorCode, number> = {
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  VALIDATION: 422,
  ALREADY_LINKED: 409,
  INTERNAL: 500,
}

function errorResponse(code: ApiErrorCode, message: string, extra?: object) {
  return HttpResponse.json(
    { error: { code, message, ...extra } },
    { status: STATUS_BY_CODE[code] },
  )
}

/**
 * Error inyectable para probar estados de error en la UI:
 * `?mockError=INTERNAL` o header `x-mock-error: INTERNAL`.
 */
function injectedError(request: Request): Response | null {
  const fromHeader = request.headers.get('x-mock-error')
  const fromQuery = new URL(request.url).searchParams.get('mockError')
  const code = (fromHeader ?? fromQuery) as ApiErrorCode | null
  if (code && code in STATUS_BY_CODE) {
    return errorResponse(code, `Injected ${code} error`)
  }
  return null
}

/**
 * La latencia simulada existe para ver los skeletons en el navegador
 * (ADR-008: 200–600 ms). En tests no aporta nada y sí hace daño: un archivo
 * puede terminar con una request todavía en vuelo, y cuando la respuesta
 * aterriza jsdom ya desmontó el entorno — el interceptor XHR de MSW explota
 * con `ReferenceError: ProgressEvent is not defined` y Vitest lo cuenta como
 * unhandled error, que hace fallar la corrida entera de forma intermitente.
 */
const IS_TEST = import.meta.env.MODE === 'test'

/** Latencia realista (ADR-008: 200–600ms) para ver skeletons. */
function latency(ms: number): Promise<void> {
  return delay(IS_TEST ? 0 : ms)
}

async function simulate(request: Request): Promise<Response | null> {
  await latency(200 + Math.random() * 400)
  return injectedError(request)
}

function parseFilters(request: Request): CatalogFilters {
  const params = new URL(request.url).searchParams
  const csv = (v: string | null) =>
    v
      ? v
          .split(',')
          .map(Number)
          .filter((n) => !Number.isNaN(n))
      : undefined
  const num = (v: string | null) => (v ? Number(v) : undefined)
  return {
    q: params.get('q') ?? undefined,
    contentType:
      (params.get('contentType') as CatalogFilters['contentType']) ?? undefined,
    videoType:
      (params.get('videoType') as CatalogFilters['videoType']) ?? undefined,
    genreIds: csv(params.get('genreIds')),
    platformIds: csv(params.get('platformIds')),
    yearFrom: num(params.get('yearFrom')),
    yearTo: num(params.get('yearTo')),
    sort: (params.get('sort') as CatalogFilters['sort']) ?? undefined,
    page: num(params.get('page')),
  }
}

function requireUser(): number | null {
  return currentUserId
}

/**
 * Los ids de link del seed van del 5000 al 5007; los que crea el mock arrancan
 * arriba de eso. `Date.now()` no servía: dos links creados en el mismo
 * milisegundo —cosa que pasa en un test— salían con el mismo id.
 */
const FIRST_LINK_ID = 6000
let nextLinkId = FIRST_LINK_ID
function newLinkId(): number {
  return nextLinkId++
}

/** Todas las carpetas del usuario logueado. */
function userTree(uid: number): SeedChecklistNode[] {
  return checklistsByUser[uid] ?? []
}

/**
 * Recalcula el agregado de cada franchise-link del usuario. El backend lo hace
 * en `compute_show_name` cada vez que cambia un hijo; acá se recorre todo
 * porque es barato y evita olvidarse de un padre afectado.
 */
function refreshAggregates(roots: SeedChecklistNode[]): void {
  for (const { entry } of locateEntries(roots, entriesByChecklist)) {
    if (entry.kind === 'franchise') {
      entry.aggregatedProgress = aggregateProgress(entry.childEntries ?? [])
    }
  }
}

/**
 * Los otros links sincronizados de la misma versión. En Odoo la relación son
 * filas de `ll.checklist.link.copy` y `Link.write` propaga `lv_episodes` por
 * ahí; el mock la aproxima con "mismo `versionId` y ambos `isSynced`", que es
 * el invariante observable desde el contrato.
 */
function syncedSiblings(
  roots: SeedChecklistNode[],
  entry: ListEntry,
): ListEntry[] {
  const versionId = entry.version?.versionId
  if (versionId == null || entry.version?.isSynced !== true) return []
  return locateEntries(roots, entriesByChecklist)
    .map((location) => location.entry)
    .filter(
      (other) =>
        other.linkId !== entry.linkId &&
        other.version?.isSynced === true &&
        other.version.versionId === versionId,
    )
}

export const handlers = [
  // ---- Master data ----
  http.get(url('/genres'), async ({ request }) => {
    const err = await simulate(request)
    return err ?? HttpResponse.json({ items: genres })
  }),
  http.get(url('/platforms'), async ({ request }) => {
    const err = await simulate(request)
    return err ?? HttpResponse.json({ items: platforms })
  }),
  http.get(url('/companies'), async ({ request }) => {
    const err = await simulate(request)
    return err ?? HttpResponse.json({ items: companies })
  }),

  // ---- Catálogo ----
  http.get(url('/franchises'), async ({ request }) => {
    const err = await simulate(request)
    if (err) return err
    const filters = parseFilters(request)
    const all = filterFranchises(filters)
    const page = filters.page ?? 1
    const pageSize = 24
    const start = (page - 1) * pageSize
    return HttpResponse.json({
      items: all.slice(start, start + pageSize),
      page,
      pageSize,
      total: all.length,
    })
  }),

  http.get(url('/franchises/:id'), async ({ request, params }) => {
    const err = await simulate(request)
    if (err) return err
    const franchise = franchises.find((f) => f.id === Number(params.id))
    if (!franchise) return errorResponse('NOT_FOUND', 'Franchise not found')
    return HttpResponse.json({ franchise })
  }),

  http.get(url('/contents/:id'), async ({ request, params }) => {
    const err = await simulate(request)
    if (err) return err
    const content = allContents().find((c) => c.id === Number(params.id))
    if (!content) return errorResponse('NOT_FOUND', 'Content not found')
    const franchise = franchises.find((f) =>
      [...f.gameContents, ...f.videoContents].some((c) => c.id === content.id),
    )!
    return HttpResponse.json({
      content: {
        ...content,
        franchise: {
          id: franchise.id,
          name: franchise.name,
          imageUrl: franchise.imageUrl,
        },
      },
    })
  }),

  http.get(url('/search'), async ({ request }) => {
    const err = await simulate(request)
    if (err) return err
    const params = new URL(request.url).searchParams
    const q = params.get('q') ?? ''
    const limit = Number(params.get('limit') ?? 8)
    return HttpResponse.json({ items: q ? searchHits(q, limit) : [] })
  }),

  // ---- Auth ----
  http.post(url('/auth/login'), async ({ request }) => {
    await latency(300)
    const err = injectedError(request)
    if (err) return err
    const body = (await request.json()) as { login?: string; password?: string }
    const user = users.find((u) => u.email === body.login)
    const validPassword =
      !!user && mockCredentials[user.email] === body.password
    // Mensaje genérico a propósito (doc 12 §5, 3.2): no le regalamos a nadie
    // si el email existe o no.
    if (!user || !validPassword) {
      return errorResponse('UNAUTHORIZED', 'Invalid email or password')
    }
    currentUserId = user.id
    return HttpResponse.json({ user })
  }),

  http.post(url('/auth/logout'), async () => {
    currentUserId = null
    return new HttpResponse(null, { status: 204 })
  }),

  http.get(url('/auth/me'), async ({ request }) => {
    const err = await simulate(request)
    if (err) return err
    const id = requireUser()
    const user = id ? users.find((u) => u.id === id) : null
    if (!user) return errorResponse('UNAUTHORIZED', 'No active session')
    return HttpResponse.json({ user })
  }),

  http.post(url('/auth/register'), async ({ request }) => {
    await latency(300)
    const err = injectedError(request)
    if (err) return err
    const body = (await request.json()) as {
      name?: string
      email?: string
      password?: string
    }
    if (!body.name || !body.email || !body.password) {
      return errorResponse(
        'VALIDATION',
        'Name, email and password are required',
      )
    }
    if (users.some((u) => u.email === body.email)) {
      return errorResponse('VALIDATION', 'Email is already registered', {
        field: 'email',
      })
    }
    const user: UserSession = {
      id: Date.now(),
      odooUserId: Date.now(),
      name: body.name,
      email: body.email,
      avatarUrl: null,
    }
    mockCredentials[user.email] = body.password
    currentUserId = user.id
    users.push(user)
    return HttpResponse.json({ user }, { status: 201 })
  }),

  // ---- Mis listas ----
  http.get(url('/me/checklists'), async ({ request }) => {
    const err = await simulate(request)
    if (err) return err
    const id = requireUser()
    if (!id) return errorResponse('UNAUTHORIZED', 'Login required')
    // `linkCount` se deriva de los entries reales (ADR-022), no sale del seed.
    return HttpResponse.json({
      items: toChecklistTree(userTree(id), entriesByChecklist),
    })
  }),

  http.post(url('/me/checklists'), async ({ request }) => {
    await latency(300)
    const err = injectedError(request)
    if (err) return err
    const uid = requireUser()
    if (!uid) return errorResponse('UNAUTHORIZED', 'Login required')
    const body = (await request.json()) as Partial<ChecklistNode> & {
      parentId?: number
    }
    const roots = userTree(uid)
    const parent = body.parentId ? findChecklist(roots, body.parentId) : null
    if (body.parentId && !parent) {
      return errorResponse('NOT_FOUND', 'Parent checklist not found')
    }
    const siblings = parent ? parent.children : roots
    const checklist: SeedChecklistNode = {
      id: Date.now(),
      name: body.name ?? 'New list',
      description: body.description ?? null,
      imageUrl: null,
      order: siblings.length,
      sortingMode: body.sortingMode ?? 'C',
      isPublished: body.isPublished ?? false,
      children: [],
    }
    if (parent) {
      parent.children = [...parent.children, checklist]
    } else {
      checklistsByUser[uid] = [...roots, checklist]
    }
    return HttpResponse.json(
      { checklist: { ...checklist, linkCount: 0 } },
      { status: 201 },
    )
  }),

  /**
   * Honra también `parentId` y `order` (deuda #6, doc 15 §4.1). Antes hacía un
   * `Object.assign` del body entero, así que los aceptaba, los pegaba como
   * campos sueltos sobre el nodo y no movía nada: un falso verde esperando a
   * que 4.10 lo llamara. El backend real ya los implementa (B4, con detección
   * de ciclos), así que rechazarlos acá habría inventado una divergencia.
   */
  http.patch(url('/me/checklists/:id'), async ({ request, params }) => {
    await latency(200)
    const err = injectedError(request)
    if (err) return err
    const uid = requireUser()
    if (!uid) return errorResponse('UNAUTHORIZED', 'Login required')
    const roots = userTree(uid)
    const list = findChecklist(roots, Number(params.id))
    if (!list) return errorResponse('NOT_FOUND', 'Checklist not found')
    const body = (await request.json()) as UpdateChecklistRequest

    if (body.name != null) list.name = body.name
    if ('description' in body) list.description = body.description ?? null
    if (body.sortingMode != null) list.sortingMode = body.sortingMode
    if (body.isPublished != null) list.isPublished = body.isPublished

    if (body.parentId != null) {
      // Mover una carpeta dentro de sí misma dejaría el árbol con un ciclo y
      // el recorrido en un loop infinito. El backend lo detecta; acá también.
      if (collectSubtreeIds(list).includes(body.parentId)) {
        return errorResponse(
          'VALIDATION',
          'A list cannot be moved into itself',
          {
            field: 'parentId',
          },
        )
      }
      const target = findChecklist(roots, body.parentId)
      if (!target) {
        return errorResponse('NOT_FOUND', 'Parent checklist not found')
      }
      removeChecklist(roots, list.id)
      list.order = target.children.length
      target.children.push(list)
    }

    if (body.order != null) {
      const siblings = findSiblings(roots, list.id)
      if (siblings) {
        const from = siblings.findIndex((sibling) => sibling.id === list.id)
        siblings.splice(from, 1)
        siblings.splice(
          Math.max(0, Math.min(body.order, siblings.length)),
          0,
          list,
        )
        // Los hermanos se renumeran enteros: dejar huecos u `order` repetidos
        // haría que el árbol dependa del orden de inserción del array.
        siblings.forEach((sibling, index) => {
          sibling.order = index
        })
      }
    }

    return HttpResponse.json({
      checklist: {
        ...list,
        linkCount: (entriesByChecklist[list.id] ?? []).length,
        children: toChecklistTree(list.children, entriesByChecklist),
      },
    })
  }),

  http.delete(url('/me/checklists/:id'), async ({ request, params }) => {
    await latency(200)
    const err = injectedError(request)
    if (err) return err
    const uid = requireUser()
    if (!uid) return errorResponse('UNAUTHORIZED', 'Login required')
    const id = Number(params.id)
    // El backend real cascadea sub-carpetas y links (`ondelete='cascade'`,
    // ver useDeleteChecklist.ts): hay que borrar los entries de TODO el
    // subárbol, no solo los del nodo apuntado, o quedan huérfanos accesibles
    // por un id de checklist que ya no existe (#5 de la revisión).
    const node = findChecklist(userTree(uid), id)
    const removed = removeChecklist(userTree(uid), id)
    if (!removed) return errorResponse('NOT_FOUND', 'Checklist not found')
    const idsToClean = node ? collectSubtreeIds(node) : [id]
    for (const cleanId of idsToClean) {
      delete entriesByChecklist[cleanId]
    }
    return new HttpResponse(null, { status: 204 })
  }),

  http.get(url('/me/checklists/:id/entries'), async ({ request, params }) => {
    const err = await simulate(request)
    if (err) return err
    if (!requireUser()) return errorResponse('UNAUTHORIZED', 'Login required')
    return HttpResponse.json({
      items: entriesByChecklist[Number(params.id)] ?? [],
    })
  }),

  /**
   * Vincular una versión a una carpeta. Replica `action_create_link` del
   * wizard de Odoo: resuelve nombre, imagen y total de episodios **desde el
   * catálogo** (nunca del body), agrupa bajo un franchise-link reutilizándolo
   * si ya existe, y detecta el duplicado antes de crear nada.
   */
  http.post(url('/me/links'), async ({ request }) => {
    await latency(350)
    const err = injectedError(request)
    if (err) return err
    const uid = requireUser()
    if (!uid) return errorResponse('UNAUTHORIZED', 'Login required')
    const body = (await request.json()) as CreateLinkRequest
    const roots = userTree(uid)

    const target = findChecklist(roots, body.checklistId)
    if (!target) return errorResponse('NOT_FOUND', 'Checklist not found')

    const ref = resolveVersion(body.versionId)
    if (!ref) return errorResponse('NOT_FOUND', 'Version not found')

    // El nombre a mostrar sale de un AltName del content, y tiene que ser de
    // ESE content: si no, el usuario podría bautizar su link con cualquier
    // nombre de la base (doc 15 §6.1).
    const chosenName = findAltName(
      ref.content.alternativeNames,
      body.displayNameId,
    )
    if (!chosenName) {
      return errorResponse(
        'VALIDATION',
        'displayNameId does not belong to this content',
        {
          field: 'displayNameId',
        },
      )
    }

    // 409 con el contexto de la lista (doc 04): sin el nombre de la carpeta,
    // elegir entre "agregar igual" y "copia sincronizada" es a ciegas.
    if (!body.force && body.syncWithLinkId == null) {
      const clashes = locateEntries(roots, entriesByChecklist).filter(
        (location) => location.entry.version?.versionId === body.versionId,
      )
      if (clashes.length > 0) {
        return errorResponse('ALREADY_LINKED', 'Version already linked', {
          existing: clashes.map((location) => ({
            entry: location.entry,
            checklistId: location.checklistId,
            checklistName: location.checklistName,
          })),
        })
      }
    }

    // Copia sincronizada: el link original tiene que ser del propio usuario.
    // `locateEntries` solo recorre su árbol, así que un id ajeno da 404 y no
    // se filtra si existe o no (mismo criterio que el backend, ADR-014).
    let source: ListEntry | null = null
    if (body.syncWithLinkId != null) {
      source =
        locateEntries(roots, entriesByChecklist).find(
          (location) => location.entry.linkId === body.syncWithLinkId,
        )?.entry ?? null
      if (!source?.version)
        return errorResponse('NOT_FOUND', 'Link to sync not found')
      source.version.isSynced = true
    }

    const entries = (entriesByChecklist[body.checklistId] ??= [])
    const entry: ListEntry = {
      linkId: newLinkId(),
      kind: 'version',
      displayName: source?.displayName ?? chosenName.name,
      imageUrl: ref.content.imageUrl ?? ref.franchise.imageUrl,
      order: 0,
      contentType: ref.content.type,
      franchiseId: ref.franchise.id,
      notes: null,
      version: {
        versionId: body.versionId,
        contentId: ref.content.id,
        abbreviation: source?.version?.abbreviation ?? ref.content.abbreviation,
        watchedEpisodes: source?.version?.watchedEpisodes ?? 0,
        totalEpisodes: ref.version.episodes,
        isSynced: source != null,
      },
    }

    if (body.groupUnderFranchise) {
      // El franchise-link se reutiliza por (carpeta, franquicia, contentType),
      // las mismas tres claves con las que lo busca el `onchange` del wizard.
      let group = entries.find(
        (candidate) =>
          candidate.kind === 'franchise' &&
          candidate.franchiseId === ref.franchise.id &&
          candidate.contentType === ref.content.type,
      )
      if (!group) {
        const franchiseName =
          body.franchiseDisplayNameId == null
            ? null
            : findAltName(
                ref.franchise.alternativeNames,
                body.franchiseDisplayNameId,
              )
        if (body.franchiseDisplayNameId != null && !franchiseName) {
          return errorResponse(
            'VALIDATION',
            'franchiseDisplayNameId does not belong to this franchise',
            { field: 'franchiseDisplayNameId' },
          )
        }
        group = {
          linkId: newLinkId(),
          kind: 'franchise',
          displayName: franchiseName?.name ?? ref.franchise.name,
          imageUrl: ref.franchise.imageUrl,
          order: entries.length,
          contentType: ref.content.type,
          franchiseId: ref.franchise.id,
          notes: null,
          showProgress: true,
          childEntries: [],
          aggregatedProgress: { groups: [] },
        }
        entries.push(group)
      }
      const children = (group.childEntries ??= [])
      entry.order = children.length
      children.push(entry)
      group.aggregatedProgress = aggregateProgress(children)
    } else {
      entry.order = entries.length
      entries.push(entry)
    }

    return HttpResponse.json({ entry }, { status: 201 })
  }),

  /**
   * Devuelve el `ListEntry` completo, no el eco del body: es lo que consume el
   * optimistic update de 3.7 al hacer `onSettled`. Si el link es sincronizado,
   * mueve también sus copias, que viven en OTRAS carpetas del usuario.
   */
  http.patch(url('/me/links/:id'), async ({ request, params }) => {
    await latency(150)
    const err = injectedError(request)
    if (err) return err
    const uid = requireUser()
    if (!uid) return errorResponse('UNAUTHORIZED', 'Login required')
    const roots = userTree(uid)
    const located = locateEntries(roots, entriesByChecklist).find(
      (location) => location.entry.linkId === Number(params.id),
    )
    if (!located) return errorResponse('NOT_FOUND', 'Link not found')

    const patch = (await request.json()) as UpdateLinkRequest
    if (patch.watchedEpisodes != null && patch.watchedEpisodes < 0) {
      return errorResponse('VALIDATION', 'watchedEpisodes must be >= 0', {
        field: 'watchedEpisodes',
      })
    }

    // `"clave" in patch` y no `!= null`: el contrato distingue "no lo mando"
    // de "lo mando en null" (borrar las notas, por ejemplo).
    const { entry } = located
    if (patch.displayName != null) entry.displayName = patch.displayName
    if ('notes' in patch) entry.notes = patch.notes ?? null
    if (patch.order != null) entry.order = patch.order
    if (patch.showProgress != null) entry.showProgress = patch.showProgress
    if ('rating' in patch) entry.rating = patch.rating ?? null
    if ('startedAt' in patch) entry.startedAt = patch.startedAt ?? null
    if ('finishedAt' in patch) entry.finishedAt = patch.finishedAt ?? null

    const version = entry.version
    if (version) {
      if ('abbreviation' in patch)
        version.abbreviation = patch.abbreviation ?? null
      if (patch.watchedEpisodes != null) {
        version.watchedEpisodes = patch.watchedEpisodes
        for (const sibling of syncedSiblings(roots, entry)) {
          if (sibling.version)
            sibling.version.watchedEpisodes = patch.watchedEpisodes
        }
      }
    }

    refreshAggregates(roots)
    return HttpResponse.json({ entry })
  }),

  http.delete(url('/me/links/:id'), async ({ request, params }) => {
    await latency(150)
    const err = injectedError(request)
    if (err) return err
    const uid = requireUser()
    if (!uid) return errorResponse('UNAUTHORIZED', 'Login required')
    const roots = userTree(uid)
    const located = locateEntries(roots, entriesByChecklist).find(
      (location) => location.entry.linkId === Number(params.id),
    )
    if (!located) return errorResponse('NOT_FOUND', 'Link not found')

    const { entry, parent, checklistId } = located
    const top = entriesByChecklist[checklistId] ?? []
    const siblings = parent?.childEntries ?? top
    const at = siblings.findIndex(
      (candidate) => candidate.linkId === entry.linkId,
    )
    if (at !== -1) siblings.splice(at, 1)

    // El franchise-link que se queda sin hijos se borra con el último de
    // ellos, igual que `action_remove` en Odoo.
    if (parent && (parent.childEntries?.length ?? 0) === 0) {
      const parentAt = top.findIndex(
        (candidate) => candidate.linkId === parent.linkId,
      )
      if (parentAt !== -1) top.splice(parentAt, 1)
    }

    refreshAggregates(roots)
    return new HttpResponse(null, { status: 204 })
  }),

  http.get(url('/me/library-index'), async ({ request }) => {
    const err = await simulate(request)
    if (err) return err
    const id = requireUser()
    if (!id) return errorResponse('UNAUTHORIZED', 'Login required')
    return HttpResponse.json(
      deriveLibraryIndex(userTree(id), entriesByChecklist),
    )
  }),

  // ---- Perfiles públicos ----
  http.get(url('/users/:id/profile'), async ({ request, params }) => {
    const err = await simulate(request)
    if (err) return err
    const ownerId = Number(params.id)
    const identity = profilesByUser[ownerId]
    if (!identity) return errorResponse('NOT_FOUND', 'Profile not found')
    const published = publishedForest(
      toChecklistTree(checklistsByUser[ownerId] ?? [], entriesByChecklist),
    )
    return HttpResponse.json({
      profile: {
        ...identity,
        // Solo listas publicadas, o las stats filtrarían el tamaño de las
        // privadas en un endpoint sin sesión (doc 04).
        stats: computeStats(published, entriesByChecklist),
        publishedChecklists: published,
      },
    })
  }),

  http.get(
    url('/users/:id/checklists/:checklistId/entries'),
    async ({ request, params }) => {
      const err = await simulate(request)
      if (err) return err
      // Búsqueda recursiva: una lista privada ANIDADA bajo una publicada
      // también tiene que quedar fuera. Antes solo se miraba el nivel raíz.
      const node = findChecklist(
        checklistsByUser[Number(params.id)] ?? [],
        Number(params.checklistId),
      )
      // 404 y no 403 (doc 04): un 403 confirma que el id existe, y un id de
      // checklist privada es adivinable a partir de los públicos vecinos.
      if (!node?.isPublished)
        return errorResponse('NOT_FOUND', 'Checklist not found')
      return HttpResponse.json({ items: entriesByChecklist[node.id] ?? [] })
    },
  ),
]
