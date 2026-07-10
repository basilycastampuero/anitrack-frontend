import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import { server } from '@/mocks/server'
import { catalogService } from '@/features/catalog/services/catalog.service'
import { ApiError } from '@/types/api.types'

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

describe('catalogService', () => {
  it('lista franquicias validando el schema paginado', async () => {
    const page = await catalogService.getFranchises()
    expect(page.total).toBeGreaterThan(0)
    expect(page.items.length).toBeGreaterThan(0)
    expect(page.items[0]).toHaveProperty('contentCounts')
  })

  it('filtra por contentType=G (solo franquicias con juegos)', async () => {
    const page = await catalogService.getFranchises({ contentType: 'G' })
    expect(page.items.every((f) => f.contentCounts.games > 0)).toBe(true)
  })

  it('devuelve el detalle anidado de una franquicia', async () => {
    const detail = await catalogService.getFranchiseDetail(1)
    expect(detail.name).toBe('Fullmetal Alchemist')
    expect(detail.videoContents[0]?.versions.length).toBeGreaterThan(0)
  })

  it('lanza ApiError NOT_FOUND para una franquicia inexistente', async () => {
    await expect(catalogService.getFranchiseDetail(9999)).rejects.toBeInstanceOf(
      ApiError,
    )
  })

  it('busca por nombre alternativo', async () => {
    const hits = await catalogService.search('Kimetsu')
    expect(hits.length).toBeGreaterThan(0)
    expect(hits[0]?.franchiseId).toBe(3)
  })
})
