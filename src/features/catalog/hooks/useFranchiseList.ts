import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { catalogService } from '@/features/catalog/services/catalog.service'
import { catalogKeys } from '@/features/catalog/hooks/queryKeys'
import type { CatalogFilters } from '@/features/catalog/types'

/**
 * Lista paginada de franquicias con filtros (doc 04). `enabled` lo usa
 * `SearchPage` (tarea 2.6): sin `q` no tiene sentido pedir el catálogo
 * completo, así que la query se mantiene apagada hasta que haya término.
 */
export function useFranchiseList(
  filters: CatalogFilters = {},
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: catalogKeys.franchises(filters),
    queryFn: () => catalogService.getFranchises(filters),
    placeholderData: keepPreviousData, // paginación sin parpadeo (Sprint 2)
    enabled: options?.enabled ?? true,
  })
}
