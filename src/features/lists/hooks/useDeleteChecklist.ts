import { useMutation, useQueryClient } from '@tanstack/react-query'
import { listsService } from '@/features/lists/services/lists.service'
import { listKeys } from '@/features/lists/hooks/queryKeys'

/**
 * Borrar carpeta (doc 12 §5, 3.4). Sin optimistic (doc 12 §5: el optimistic
 * queda reservado a mutaciones idempotentes sobre un nodo existente — borrar
 * un subárbol entero no lo es).
 *
 * Invalida el prefijo entero `listKeys.all`, no solo `tree()` + `entries(id)`:
 * el backend cascadea sub-carpetas y links (`ondelete='cascade'`), y desde
 * acá no tenemos forma barata de saber qué sub-carpetas tenía esta carpeta
 * (para invalidar sus `entries()` puntualmente) ni si algún link borrado
 * era la única aparición de esa versión en la biblioteca del usuario (lo que
 * dejaría `libraryIndex()` — el índice de "ya está en tu lista" que pinta el
 * badge en el catálogo — obsoleto). Invalidar todo `['lists']` es barato
 * (un GET liviano por query activa) y elimina esa clase entera de bugs de
 * cache stale (#5 de la revisión).
 */
export function useDeleteChecklist() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => listsService.deleteChecklist(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: listKeys.all })
    },
  })
}
