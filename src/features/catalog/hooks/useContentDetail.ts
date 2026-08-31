import { useQuery } from '@tanstack/react-query'
import { catalogService } from '@/features/catalog/services/catalog.service'
import { catalogKeys } from '@/features/catalog/hooks/queryKeys'

/** Detalle de un content con su franchise (doc 04: `GET /contents/:id`), para deep-links. */
export function useContentDetail(id: number | null) {
  return useQuery({
    queryKey: catalogKeys.content(id ?? -1),
    queryFn: () => catalogService.getContent(id!),
    enabled: id != null,
  })
}
