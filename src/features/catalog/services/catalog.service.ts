import { http } from '@/lib/http'
import { paginatedSchema } from '@/types/api.types'
import type { Paginated } from '@/types/api.types'
import { z } from 'zod'
import {
  franchiseSummarySchema,
  franchiseDetailSchema,
  contentDetailWithFranchiseSchema,
  searchHitSchema,
  genreSchema,
  platformRefSchema,
} from '@/features/catalog/services/schemas'
import type {
  FranchiseSummary,
  FranchiseDetail,
  ContentDetailWithFranchise,
  SearchHit,
  Genre,
  PlatformRef,
  CatalogFilters,
} from '@/features/catalog/types'

/** Traduce los filtros del dominio a query params del contrato (doc 04). */
function toParams(filters: CatalogFilters): Record<string, string> {
  const params: Record<string, string> = {}
  if (filters.q) params.q = filters.q
  if (filters.contentType) params.contentType = filters.contentType
  if (filters.videoType) params.videoType = filters.videoType
  if (filters.genreIds?.length) params.genreIds = filters.genreIds.join(',')
  if (filters.platformIds?.length)
    params.platformIds = filters.platformIds.join(',')
  if (filters.yearFrom != null) params.yearFrom = String(filters.yearFrom)
  if (filters.yearTo != null) params.yearTo = String(filters.yearTo)
  if (filters.sort) params.sort = filters.sort
  if (filters.page != null) params.page = String(filters.page)
  return params
}

export const catalogService = {
  async getFranchises(
    filters: CatalogFilters = {},
  ): Promise<Paginated<FranchiseSummary>> {
    const { data } = await http.get('/franchises', { params: toParams(filters) })
    return paginatedSchema(franchiseSummarySchema).parse(data)
  },

  async getFranchiseDetail(id: number): Promise<FranchiseDetail> {
    const { data } = await http.get(`/franchises/${id}`)
    return z.object({ franchise: franchiseDetailSchema }).parse(data).franchise
  },

  async getContent(id: number): Promise<ContentDetailWithFranchise> {
    const { data } = await http.get(`/contents/${id}`)
    return z.object({ content: contentDetailWithFranchiseSchema }).parse(data)
      .content
  },

  async search(q: string, limit = 8): Promise<SearchHit[]> {
    const { data } = await http.get('/search', { params: { q, limit } })
    return z.object({ items: z.array(searchHitSchema) }).parse(data).items
  },

  async getGenres(): Promise<Genre[]> {
    const { data } = await http.get('/genres')
    return z.object({ items: z.array(genreSchema) }).parse(data).items
  },

  async getPlatforms(): Promise<PlatformRef[]> {
    const { data } = await http.get('/platforms')
    return z.object({ items: z.array(platformRefSchema) }).parse(data).items
  },
}
