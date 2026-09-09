import { useQuery } from '@tanstack/react-query'
import { catalogService } from '@/features/catalog/services/catalog.service'
import { catalogKeys } from '@/features/catalog/hooks/queryKeys'

/** Plataformas del catálogo (doc 04). Casi estáticas: no vale la pena revalidar. */
export function usePlatforms() {
  return useQuery({
    queryKey: catalogKeys.platforms(),
    queryFn: () => catalogService.getPlatforms(),
    staleTime: Infinity,
  })
}
