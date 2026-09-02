import { useQuery } from '@tanstack/react-query'
import { listsService } from '@/features/lists/services/lists.service'
import { listKeys } from '@/features/lists/hooks/queryKeys'
import { useSessionStore } from '@/store/sessionStore'

/**
 * Índice de lo ya vinculado, para pintar "in your list" sobre las cards.
 * Solo se consulta con sesión activa; sin ella, la UI no muestra el indicador.
 */
export function useLibraryIndex() {
  const status = useSessionStore((s) => s.status)
  return useQuery({
    queryKey: listKeys.libraryIndex(),
    queryFn: () => listsService.getLibraryIndex(),
    enabled: status === 'authenticated',
    staleTime: 30_000,
  })
}
