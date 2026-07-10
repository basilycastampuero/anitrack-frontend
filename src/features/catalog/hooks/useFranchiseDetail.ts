import { useQuery } from '@tanstack/react-query'
import { catalogService } from '@/features/catalog/services/catalog.service'
import { catalogKeys } from '@/features/catalog/hooks/queryKeys'

/** Detalle completo de una franquicia con contents y versions anidados. */
export function useFranchiseDetail(id: number | null) {
  return useQuery({
    queryKey: catalogKeys.franchise(id ?? -1),
    queryFn: () => catalogService.getFranchiseDetail(id!),
    enabled: id != null,
  })
}
