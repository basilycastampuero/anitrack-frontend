import type { CatalogFilters } from '@/features/catalog/types'

/** Claves de cache de TanStack Query para el catálogo (doc 05: id = identidad). */
export const catalogKeys = {
  all: ['catalog'] as const,
  franchises: (filters: CatalogFilters) =>
    [...catalogKeys.all, 'franchises', filters] as const,
  franchise: (id: number) => [...catalogKeys.all, 'franchise', id] as const,
  content: (id: number) => [...catalogKeys.all, 'content', id] as const,
  search: (q: string) => [...catalogKeys.all, 'search', q] as const,
  genres: () => [...catalogKeys.all, 'genres'] as const,
  platforms: () => [...catalogKeys.all, 'platforms'] as const,
}
