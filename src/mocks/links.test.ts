import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest'
import { server } from '@/mocks/server'
import { http as api } from '@/lib/http'
import { listsService } from '@/features/lists/services/lists.service'
import { franchises } from '@/mocks/seed/franchises'
import { ApiError } from '@/types/api.types'
import type { ChecklistNode, ListEntry } from '@/features/lists/types'

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

/**
 * Tarea 3.12. Cada test fuerza al mock a EJECUTAR el modelo, no a registrar
 * que lo llamaron: se crea/patchea/borra por la API y después se lee por otra
 * ruta distinta, de modo que un handler que devuelva el eco del body no puede
 * hacerlos pasar.
 *
 * Es la lección del Sprint 3a ("Patrón recurrente del sprint", bitácora 13):
 * un mock que no mantiene invariantes hace pasar en verde tareas que no
 * funcionan.
 */

function must<T>(value: T | undefined | null, what: string): T {
  if (value == null) throw new Error(`fixture inválida: falta ${what}`)
  return value
}

/** Un `versionId` del seed de catálogo con el `displayNameId` que le corresponde. */
function versionFixture(versionId: number) {
  for (const franchise of franchises) {
    for (const content of [
      ...franchise.gameContents,
      ...franchise.videoContents,
    ]) {
      if (content.versions.some((v) => v.id === versionId)) {
        return {
          versionId,
          displayNameId: must(
            content.alternativeNames[0],
            `alt name de ${content.id}`,
          ).id,
          franchiseDisplayNameId: must(
            franchise.alternativeNames[0],
            `alt name de la franquicia ${franchise.id}`,
          ).id,
          franchiseId: franchise.id,
        }
      }
    }
  }
  throw new Error(
    `fixture inválida: la versión ${versionId} no está en el seed`,
  )
}

async function createLink(body: Record<string, unknown>): Promise<ListEntry> {
  const { data } = await api.post<{ entry: ListEntry }>('/me/links', body)
  return data.entry
}

function findNode(nodes: ChecklistNode[], id: number): ChecklistNode | null {
  for (const node of nodes) {
    if (node.id === id) return node
    const found = findNode(node.children, id)
    if (found) return found
  }
  return null
}

describe('POST /me/links', () => {
  it('inserta en la carpeta pedida y el linkCount de esa sub-carpeta anidada sube', async () => {
    // "2010s" (id 6) cuelga cuatro niveles abajo: Favorites > All-time > By decade > 2010s.
    const before = must(
      findNode(await listsService.getChecklists(), 6),
      'carpeta 6',
    )
    expect(before.linkCount).toBe(1)

    await createLink({
      checklistId: 6,
      groupUnderFranchise: false,
      ...versionFixture(1002),
    })

    const after = must(
      findNode(await listsService.getChecklists(), 6),
      'carpeta 6',
    )
    expect(after.linkCount).toBe(2)
    expect(await listsService.getEntries(6)).toHaveLength(2)
  })

  it('resuelve nombre, imagen y total de episodios desde el catálogo, no del body', async () => {
    const entry = await createLink({
      checklistId: 1,
      groupUnderFranchise: false,
      ...versionFixture(1002),
    })
    expect(entry.displayName).not.toBe('New link')
    expect(entry.version?.totalEpisodes).toBe(1) // episodes de la versión 1002
    expect(entry.imageUrl).not.toBeNull()
    expect(entry.franchiseId).toBe(versionFixture(1002).franchiseId)
  })

  it('agrupa dos versiones de la misma franquicia bajo UN franchise-link con dos hijos', async () => {
    for (const versionId of [1001, 1002]) {
      await createLink({
        checklistId: 1,
        groupUnderFranchise: true,
        ...versionFixture(versionId),
      })
    }

    const entries = await listsService.getEntries(1)
    const groups = entries.filter(
      (e) => e.kind === 'franchise' && e.franchiseId === 1,
    )
    expect(groups).toHaveLength(1)
    expect(must(groups[0], 'grupo').childEntries).toHaveLength(2)
    // El agregado también se recalcula, no queda en el `groups: []` del alta.
    expect(must(groups[0], 'grupo').aggregatedProgress?.groups).toHaveLength(2)
  })

  it('el 409 dice en qué lista está ya la versión', async () => {
    // La versión 1005 ya está vinculada en "Watching" (id 1) por el seed.
    const error = await createLink({
      checklistId: 2,
      groupUnderFranchise: false,
      ...versionFixture(1005),
    }).catch((e: unknown) => e)

    expect(error).toBeInstanceOf(ApiError)
    expect((error as ApiError).code).toBe('ALREADY_LINKED')
    const existing = (error as ApiError).detail as {
      checklistId: number
      checklistName: string
    }[]
    expect(existing[0]?.checklistId).toBe(1)
    expect(existing[0]?.checklistName).toBe('Watching')
  })

  it('con force: true vincula igual', async () => {
    const entry = await createLink({
      checklistId: 2,
      groupUnderFranchise: false,
      force: true,
      ...versionFixture(1005),
    })
    expect(entry.version?.versionId).toBe(1005)
  })
})

describe('PATCH /me/links/:id', () => {
  it('mueve también la copia sincronizada, que vive en otra carpeta', async () => {
    // 5007 ("Completed") y 5006 ("2010s") son el mismo versionId, ambos synced.
    await api.patch('/me/links/5007', { watchedEpisodes: 10 })

    const other = must((await listsService.getEntries(6))[0], 'entry 5006')
    expect(other.linkId).toBe(5006)
    expect(other.version?.watchedEpisodes).toBe(10)
  })

  it('rechaza un progreso negativo con VALIDATION', async () => {
    const error = await api
      .patch('/me/links/5000', { watchedEpisodes: -1 })
      .catch((e: unknown) => e)
    expect((error as ApiError).code).toBe('VALIDATION')
    expect((error as ApiError).field).toBe('watchedEpisodes')
  })

  it('devuelve el entry completo y recalcula el agregado del padre', async () => {
    await api.patch('/me/links/5003', { watchedEpisodes: 7 })

    const entries = await listsService.getEntries(1)
    const group = must(
      entries.find((e) => e.linkId === 5001),
      'grupo Spy x Family',
    )
    expect(group.aggregatedProgress?.groups[1]).toEqual({
      abbreviation: 'S2',
      watched: 7,
      total: 0,
    })
  })
})

describe('DELETE /me/links/:id', () => {
  it('borra el franchise-link cuando se va su último hijo', async () => {
    await api.delete('/me/links/5002')
    let entries = await listsService.getEntries(1)
    expect(entries.find((e) => e.linkId === 5001)).toBeDefined() // todavía queda un hijo

    await api.delete('/me/links/5003')
    entries = await listsService.getEntries(1)
    expect(entries.find((e) => e.linkId === 5001)).toBeUndefined()
  })

  it('saca la versión del library-index al desvincularla', async () => {
    const before = await listsService.getLibraryIndex()
    expect(before.versionIds).toContain(1000)
    expect(before.franchiseIds).toContain(1)

    await api.delete('/me/links/5005') // única aparición de la versión 1000

    const after = await listsService.getLibraryIndex()
    expect(after.versionIds).not.toContain(1000)
    expect(after.franchiseIds).not.toContain(1)
  })
})

describe('rutas públicas', () => {
  it('una lista privada ANIDADA devuelve 404, no sus entries', async () => {
    // "2010s" (6) es privada y cuelga de tres carpetas privadas. El mock viejo
    // solo filtraba el nivel raíz, así que la devolvía entera.
    const error = await api
      .get('/users/1/checklists/6/entries')
      .catch((e: unknown) => e)
    expect((error as ApiError).code).toBe('NOT_FOUND')

    const { data } = await api.get<{ items: ListEntry[] }>(
      '/users/1/checklists/1/entries',
    )
    expect(data.items.length).toBeGreaterThan(0)
  })

  it('las stats cuentan solo listas publicadas', async () => {
    const { data: before } = await api.get<{
      profile: { stats: { totalEntries: number } }
    }>('/users/1/profile')

    // "All-time" (4) es privada: agregarle un entry no puede mover las stats.
    await createLink({
      checklistId: 4,
      groupUnderFranchise: false,
      ...versionFixture(1002),
    })

    const { data: after } = await api.get<{
      profile: { stats: { totalEntries: number } }
    }>('/users/1/profile')
    expect(after.profile.stats.totalEntries).toBe(
      before.profile.stats.totalEntries,
    )
  })

  it('publishedChecklists es un bosque: una sub-carpeta publicada sale como raíz', async () => {
    await listsService.updateChecklist(6, { isPublished: true })

    const { data } = await api.get<{
      profile: { publishedChecklists: ChecklistNode[] }
    }>('/users/1/profile')
    const roots = data.profile.publishedChecklists.map((c) => c.id)
    // 6 cuelga de 3/4/5, todas privadas, así que va como raíz del bosque.
    expect(roots).toContain(6)
    expect(roots).not.toContain(3)
  })
})
