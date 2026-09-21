import { useMutation, useQueryClient } from '@tanstack/react-query'
import { listsService } from '@/features/lists/services/lists.service'
import { listKeys } from '@/features/lists/hooks/queryKeys'
import { patchChecklistNode } from '@/features/lists/utils/checklistTree'
import type {
  ChecklistNode,
  CosmeticChecklistPatch,
} from '@/features/lists/types'

interface UpdateChecklistVariables {
  id: number
  /**
   * Solo campos cosméticos (deuda #6, doc 15 §4.1): mover o reordenar una
   * carpeta es estructural y no puede ir por el camino optimista, porque
   * `patchChecklistNode` no sabe hacerlo. Mover/reordenar es la tarea 4.10.
   */
  patch: CosmeticChecklistPatch
}

interface UpdateChecklistContext {
  previousTree: ChecklistNode[] | undefined
}

/**
 * Renombrar/publicar una carpeta (doc 12 §5, 3.4). Optimistic porque es una
 * edición idempotente sobre un nodo que ya existe en cache (a diferencia de
 * crear/borrar): el usuario espera ver el cambio al instante en el árbol.
 *
 * `onMutate` cancela cualquier fetch de `tree()` en vuelo (si no, esa
 * respuesta podría llegar después del patch optimista y pisarlo con datos
 * viejos), guarda el árbol completo como snapshot y escribe el nodo
 * modificado recorriéndolo. `onError` restaura el snapshot ENTERO en vez de
 * revertir el nodo puntual: más simple y más seguro si, por ejemplo, la
 * mutación falla justo cuando otra ya había cambiado el árbol.
 */
export function useUpdateChecklist() {
  const queryClient = useQueryClient()

  return useMutation<
    ChecklistNode,
    unknown,
    UpdateChecklistVariables,
    UpdateChecklistContext
  >({
    mutationFn: ({ id, patch }) => listsService.updateChecklist(id, patch),

    onMutate: async ({ id, patch }) => {
      await queryClient.cancelQueries({ queryKey: listKeys.tree() })

      const previousTree = queryClient.getQueryData<ChecklistNode[]>(
        listKeys.tree(),
      )
      if (previousTree) {
        queryClient.setQueryData(
          listKeys.tree(),
          patchChecklistNode(previousTree, id, patch),
        )
      }

      return { previousTree }
    },

    onError: (_error, _variables, context) => {
      if (context?.previousTree) {
        queryClient.setQueryData(listKeys.tree(), context.previousTree)
      }
    },

    // Reconciliación obligatoria en AMBOS caminos: el patch optimista es una
    // suposición nuestra, no la verdad del servidor. Si el backend normaliza
    // el nombre (trim, colisión resuelta con sufijo) o toca campos derivados,
    // sin esto el árbol se queda con la suposición hasta el próximo refetch
    // (staleTime 60s, o nunca si la vista no se desmonta). En el camino de
    // error, además, el snapshot restaurado puede ser viejo de por sí.
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: listKeys.tree() })
    },
  })
}
