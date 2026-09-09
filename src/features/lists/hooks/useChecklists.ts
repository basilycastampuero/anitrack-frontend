import { useQuery } from '@tanstack/react-query'
import { listsService } from '@/features/lists/services/lists.service'
import { listKeys } from '@/features/lists/hooks/queryKeys'
import { useSessionStore } from '@/store/sessionStore'

/**
 * Árbol de carpetas del usuario (doc 04: `GET /me/checklists`). Gateado por
 * sesión igual que `useLibraryIndex`: aunque hoy solo se usa detrás de
 * `<RequireAuth>`, evita un fetch inútil mientras el bootstrap de sesión
 * todavía está resolviendo (`status === 'idle'`).
 */
export function useChecklists() {
  const status = useSessionStore((s) => s.status)
  return useQuery({
    queryKey: listKeys.tree(),
    queryFn: () => listsService.getChecklists(),
    enabled: status === 'authenticated',
  })
}
