import { useMutation, useQueryClient } from '@tanstack/react-query'
import { listsService } from '@/features/lists/services/lists.service'
import { listKeys } from '@/features/lists/hooks/queryKeys'
import type { CreateLinkRequest, ListEntry } from '@/features/lists/types'

/**
 * Vincular una versión a una carpeta (tarea 3.8).
 *
 * **Sin optimistic**, por la misma regla que crear una carpeta en el 3a: el
 * id lo asigna el servidor, así que el camino optimista obligaría a inventar
 * un id temporal y reconciliarlo. Se invalida y se espera.
 *
 * **Qué invalida** (§3.2): `entries(checklistId)`, `tree()` y
 * `libraryIndex()`. `tree()` se invalida **siempre**, aunque agrupar bajo un
 * franchise-link que ya existía quizá no mueva `linkCount`: predecir eso desde
 * el cliente sería replicar una regla del backend para ahorrarse un GET
 * liviano.
 */
export function useCreateLink() {
  const queryClient = useQueryClient()

  return useMutation<ListEntry, unknown, CreateLinkRequest>({
    mutationFn: (body) => listsService.createLink(body),
    onSuccess: (_entry, body) => {
      void queryClient.invalidateQueries({
        queryKey: listKeys.entries(body.checklistId),
      })
      void queryClient.invalidateQueries({ queryKey: listKeys.tree() })
      void queryClient.invalidateQueries({ queryKey: listKeys.libraryIndex() })
    },
  })
}
