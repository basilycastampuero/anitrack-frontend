import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { listsService } from '@/features/lists/services/lists.service'
import { listKeys } from '@/features/lists/hooks/queryKeys'
import { t } from '@/i18n/en'

interface DeleteLinkVariables {
  linkId: number
  /** Carpeta donde vivía, para invalidar sus entries. */
  checklistId: number
  /** Si era sincronizado, sus copias en otras carpetas también cambian. */
  isSynced?: boolean
}

/**
 * Desvincular (tarea 3.8). Hoy su único caller es el "deshacer" del toast que
 * aparece al vincular.
 *
 * **Qué invalida** (§3.2): `entries(checklistId)`, `tree()` y `libraryIndex()`
 * —borrar sí puede achicar el contador y sacar la versión del índice— y, si el
 * link era sincronizado, el prefijo entero `listKeys.all`, por la misma razón
 * que en `useUpdateEntryProgress`: el contrato no dice dónde viven las copias.
 *
 * El aviso de error vive en las opciones del hook y **no** en las de la
 * llamada a `mutate`. Cuando el usuario toca "deshacer", el wizard que disparó
 * el toast ya se desmontó, y TanStack v5 gatea los callbacks pasados a
 * `mutate` por `hasListeners()` del observer: sin nadie escuchando, nunca
 * correrían. Los de acá los invoca la mutación misma, así que un fallo del
 * deshacer se ve igual.
 */
export function useDeleteLink() {
  const queryClient = useQueryClient()

  return useMutation<void, unknown, DeleteLinkVariables>({
    mutationFn: ({ linkId }) => listsService.deleteLink(linkId),
    onError: () => toast.error(t.lists.wizard.undoFailed),
    onSuccess: (_result, { checklistId, isSynced }) => {
      if (isSynced) {
        void queryClient.invalidateQueries({ queryKey: listKeys.all })
        return
      }
      void queryClient.invalidateQueries({
        queryKey: listKeys.entries(checklistId),
      })
      void queryClient.invalidateQueries({ queryKey: listKeys.tree() })
      void queryClient.invalidateQueries({ queryKey: listKeys.libraryIndex() })
    },
  })
}
