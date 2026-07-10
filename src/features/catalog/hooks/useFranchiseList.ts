import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { catalogService } from '@/features/catalog/services/catalog.service'
import { catalogKeys } from '@/features/catalog/hooks/queryKeys'
import type { CatalogFilters } from '@/features/catalog/types'

/** Lista paginada de franquicias con filtros (doc 04). */
export function useFranchiseList(filters: CatalogFilters = {}) {
  return useQuery({
    queryKey: catalogKeys.franchises(filters),
    queryFn: () => catalogService.getFranchises(filters),
    placeholderData: keepPreviousData, // paginación sin parpadeo (Sprint 2)
  })
}
