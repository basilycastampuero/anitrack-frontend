import { useQuery } from '@tanstack/react-query'
import { catalogService } from '@/features/catalog/services/catalog.service'
import { catalogKeys } from '@/features/catalog/hooks/queryKeys'

/** Géneros del catálogo (doc 04). Casi estáticos: no vale la pena revalidar. */
export function useGenres() {
  return useQuery({
    queryKey: catalogKeys.genres(),
    queryFn: () => catalogService.getGenres(),
    staleTime: Infinity,
  })
}
