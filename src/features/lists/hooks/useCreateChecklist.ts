import { useMutation, useQueryClient } from '@tanstack/react-query'
import { listsService } from '@/features/lists/services/lists.service'
import { listKeys } from '@/features/lists/hooks/queryKeys'
import type { CreateChecklistRequest } from '@/features/lists/types'

/**
 * Crear carpeta (doc 12 §5, 3.4). Sin optimistic: a diferencia de renombrar/
 * publicar, acá no hay un nodo existente para editar in-place — habría que
 * inventar un id temporal y reconciliarlo con el id real que devuelve el
 * backend, que para una operación que no es de las más frecuentes no vale lo
 * que cuesta (doc 12 §5). Se invalida `tree()` y se espera el refetch.
 */
export function useCreateChecklist() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (body: CreateChecklistRequest) => listsService.createChecklist(body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: listKeys.tree() })
    },
  })
}
