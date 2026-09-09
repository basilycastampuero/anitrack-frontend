import { useQuery } from '@tanstack/react-query'
import { listsService } from '@/features/lists/services/lists.service'
import { listKeys } from '@/features/lists/hooks/queryKeys'
import { useSessionStore } from '@/store/sessionStore'

/**
 * Contenido de una carpeta (doc 04: `GET /me/checklists/:id/entries`), para
 * renderizar "Mi Lista" una vez seleccionado un nodo del árbol.
 *
 * `checklistId` es `number | null` (no `number`) porque el caller lo deriva
 * del param de ruta `/my-lists/:checklistId` con `parseIdParam` (mismo
 * criterio que `useFranchiseDetail`/`useContentDetail`): un id ausente o no
 * numérico cae a `null` en vez de convertirse en `NaN`. Sin esto, una URL como
 * `/my-lists/abc` dispararía `GET /me/checklists/NaN/entries` (hallazgo de
 * revisión #11) — el sentinel `-1` en la queryKey y el `enabled` de abajo
 * evitan tanto la request inválida como una key de cache con `NaN`.
 */
export function useChecklistEntries(checklistId: number | null) {
  const status = useSessionStore((s) => s.status)
  return useQuery({
    queryKey: listKeys.entries(checklistId ?? -1),
    queryFn: () => listsService.getEntries(checklistId!),
    enabled: status === 'authenticated' && checklistId != null,
  })
}
