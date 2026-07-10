import { useQuery } from '@tanstack/react-query'
import { catalogService } from '@/features/catalog/services/catalog.service'
import { catalogKeys } from '@/features/catalog/hooks/queryKeys'

/** Autocompletado de búsqueda (doc 04). El debounce lo aplica la SearchBar. */
export function useSearch(q: string) {
  const query = q.trim()
  return useQuery({
    queryKey: catalogKeys.search(query),
    queryFn: () => catalogService.search(query),
    enabled: query.length >= 2,
  })
}
