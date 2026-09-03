import { http, HttpResponse, delay } from 'msw'
import type { ApiErrorCode } from '@/types/api.types'
import type { CatalogFilters } from '@/features/catalog/types'
import type { ChecklistNode, ListEntry } from '@/features/lists/types'
import { genres, platforms, companies } from '@/mocks/seed/masters'
import { franchises, allContents } from '@/mocks/seed/franchises'
import { filterFranchises, searchHits } from '@/mocks/seed/derive'
import type { UserSession } from '@/features/auth/types'
import {
  users,
  mockCredentials,
  checklistsByUser,
  entriesByChecklist,
  libraryIndexByUser,
  profilesByUser,
} from '@/mocks/seed/lists'

const BASE = '/api/v1'
const url = (path: string) => `${BASE}${path}`

/** Sesión mock en memoria. Default: usuario 1 logueado (mejor demo). */
let currentUserId: number | null = 1

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

/** Latencia realista (ADR-008: 200–600ms) para ver skeletons. */
async function simulate(request: Request): Promise<Response | null> {
  await delay(200 + Math.random() * 400)
  return injectedError(request)
}

function parseFilters(request: Request): CatalogFilters {
  const params = new URL(request.url).searchParams
  const csv = (v: string | null) =>
    v ? v.split(',').map(Number).filter((n) => !Number.isNaN(n)) : undefined
  const num = (v: string | null) => (v ? Number(v) : undefined)
  return {
    q: params.get('q') ?? undefined,
    contentType: (params.get('contentType') as CatalogFilters['contentType']) ?? undefined,
    videoType: (params.get('videoType') as CatalogFilters['videoType']) ?? undefined,
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
 * `checklistsByUser` es un árbol (doc 04: `children` anida sub-carpetas), no
 * una lista plana. Buscar/borrar solo en el nivel superior deja fuera
 * cualquier nodo anidado (p. ej. el seed tiene "All-time" bajo "Favorites",
 * ver `mocks/seed/lists.ts`) — estos dos helpers recorren el árbol completo,
 * los usan PATCH, DELETE y POST (para `parentId`).
 */
function findChecklistNode(nodes: ChecklistNode[], id: number): ChecklistNode | null {
  for (const node of nodes) {
    if (node.id === id) return node
    const found = findChecklistNode(node.children, id)
    if (found) return found
  }
  return null
}

/** Quita el nodo `id` de donde esté en el árbol (in-place). `true` si lo encontró. */
function removeChecklistNode(nodes: ChecklistNode[], id: number): boolean {
  const index = nodes.findIndex((n) => n.id === id)
  if (index !== -1) {
    nodes.splice(index, 1)
    return true
  }
  return nodes.some((n) => removeChecklistNode(n.children, id))
}

/** El propio id de `node` más el de todos sus descendientes (recursivo). */
function collectSubtreeIds(node: ChecklistNode): number[] {
  return [node.id, ...node.children.flatMap(collectSubtreeIds)]
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
    await delay(300)
    const err = injectedError(request)
    if (err) return err
    const body = (await request.json()) as { login?: string; password?: string }
    const user = users.find((u) => u.email === body.login)
    const validPassword = !!user && mockCredentials[user.email] === body.password
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
    await delay(300)
    const err = injectedError(request)
    if (err) return err
    const body = (await request.json()) as {
      name?: string
      email?: string
      password?: string
    }
    if (!body.name || !body.email || !body.password) {
      return errorResponse('VALIDATION', 'Name, email and password are required')
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
    return HttpResponse.json({ items: checklistsByUser[id] ?? [] })
  }),

  http.post(url('/me/checklists'), async ({ request }) => {
    await delay(300)
    const err = injectedError(request)
    if (err) return err
    const uid = requireUser()
    if (!uid) return errorResponse('UNAUTHORIZED', 'Login required')
    const body = (await request.json()) as Partial<ChecklistNode> & { parentId?: number }
    const roots = checklistsByUser[uid] ?? []
    const parent = body.parentId ? findChecklistNode(roots, body.parentId) : null
    if (body.parentId && !parent) {
      return errorResponse('NOT_FOUND', 'Parent checklist not found')
    }
    const siblings = parent ? parent.children : roots
    const checklist: ChecklistNode = {
      id: Date.now(),
      name: body.name ?? 'New list',
      description: body.description ?? null,
      imageUrl: null,
      order: siblings.length,
      sortingMode: body.sortingMode ?? 'C',
      isPublished: body.isPublished ?? false,
      children: [],
      linkCount: 0,
    }
    if (parent) {
      parent.children = [...parent.children, checklist]
    } else {
      checklistsByUser[uid] = [...roots, checklist]
    }
    return HttpResponse.json({ checklist }, { status: 201 })
  }),

  http.patch(url('/me/checklists/:id'), async ({ request, params }) => {
    await delay(200)
    const err = injectedError(request)
    if (err) return err
    const uid = requireUser()
    if (!uid) return errorResponse('UNAUTHORIZED', 'Login required')
    const list = findChecklistNode(checklistsByUser[uid] ?? [], Number(params.id))
    if (!list) return errorResponse('NOT_FOUND', 'Checklist not found')
    Object.assign(list, await request.json())
    return HttpResponse.json({ checklist: list })
  }),

  http.delete(url('/me/checklists/:id'), async ({ request, params }) => {
    await delay(200)
    const err = injectedError(request)
    if (err) return err
    const uid = requireUser()
    if (!uid) return errorResponse('UNAUTHORIZED', 'Login required')
    const id = Number(params.id)
    // El backend real cascadea sub-carpetas y links (`ondelete='cascade'`,
    // ver useDeleteChecklist.ts): hay que borrar los entries de TODO el
    // subárbol, no solo los del nodo apuntado, o quedan huérfanos accesibles
    // por un id de checklist que ya no existe (#5 de la revisión).
    const node = findChecklistNode(checklistsByUser[uid] ?? [], id)
    const removed = removeChecklistNode(checklistsByUser[uid] ?? [], id)
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
    return HttpResponse.json({ items: entriesByChecklist[Number(params.id)] ?? [] })
  }),

  http.post(url('/me/links'), async ({ request }) => {
    await delay(350)
    const uid = requireUser()
    if (!uid) return errorResponse('UNAUTHORIZED', 'Login required')
    const body = (await request.json()) as {
      versionId: number
      force?: boolean
    }
    const index = libraryIndexByUser[uid] ?? { versionIds: [], franchiseIds: [] }
    if (index.versionIds.includes(body.versionId) && !body.force) {
      return errorResponse('ALREADY_LINKED', 'Version already linked', {
        existing: [],
      })
    }
    const entry: ListEntry = {
      linkId: Date.now(),
      kind: 'version',
      displayName: 'New link',
      imageUrl: null,
      order: 0,
      contentType: 'V',
      franchiseId: 0,
      notes: null,
      version: {
        versionId: body.versionId,
        contentId: 0,
        abbreviation: null,
        watchedEpisodes: 0,
        totalEpisodes: 0,
        isSynced: false,
      },
    }
    index.versionIds = [...index.versionIds, body.versionId]
    libraryIndexByUser[uid] = index
    return HttpResponse.json({ entry }, { status: 201 })
  }),

  http.patch(url('/me/links/:id'), async ({ request }) => {
    await delay(150)
    if (!requireUser()) return errorResponse('UNAUTHORIZED', 'Login required')
    const patch = (await request.json()) as Record<string, unknown>
    // Eco optimista: en Sprint 3 el backend/MSW recalcula agregados reales.
    return HttpResponse.json({ entry: { ...patch } })
  }),

  http.delete(url('/me/links/:id'), async () => {
    await delay(150)
    if (!requireUser()) return errorResponse('UNAUTHORIZED', 'Login required')
    return new HttpResponse(null, { status: 204 })
  }),

  http.get(url('/me/library-index'), async ({ request }) => {
    const err = await simulate(request)
    if (err) return err
    const id = requireUser()
    if (!id) return errorResponse('UNAUTHORIZED', 'Login required')
    return HttpResponse.json(
      libraryIndexByUser[id] ?? { versionIds: [], franchiseIds: [] },
    )
  }),

  // ---- Perfiles públicos ----
  http.get(url('/users/:id/profile'), async ({ request, params }) => {
    const err = await simulate(request)
    if (err) return err
    const profile = profilesByUser[Number(params.id)]
    if (!profile) return errorResponse('NOT_FOUND', 'Profile not found')
    return HttpResponse.json({ profile })
  }),

  http.get(
    url('/users/:id/checklists/:checklistId/entries'),
    async ({ request, params }) => {
      const err = await simulate(request)
      if (err) return err
      const checklistId = Number(params.checklistId)
      const owner = checklistsByUser[Number(params.id)] ?? []
      const found = owner.find((c) => c.id === checklistId)
      if (found && !found.isPublished) {
        return errorResponse('FORBIDDEN', 'List is private')
      }
      return HttpResponse.json({ items: entriesByChecklist[checklistId] ?? [] })
    },
  ),
]
