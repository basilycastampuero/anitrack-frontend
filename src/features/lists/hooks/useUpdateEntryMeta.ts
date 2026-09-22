import { useMemo } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { listsService } from '@/features/lists/services/lists.service'
import { listKeys } from '@/features/lists/hooks/queryKeys'
import { patchEntryFields } from '@/features/lists/utils/entryTree'
import { isFeatureEnabled } from '@/lib/features'
import { t } from '@/i18n/en'
import type { EntryMetaPatch } from '@/features/lists/utils/entryTree'
import type { ListEntry, UpdateLinkRequest } from '@/features/lists/types'

interface MutationContext {
  snapshot: ListEntry[] | undefined
}

/**
 * Editar notas, puntaje y fechas de un entry (tarea 3.11).
 *
 * Reusa el **patrón** de `useUpdateEntryProgress` —snapshot, rollback, toast,
 * `onSettled`— pero no su helper: `patchEntryFields` no aplica ningún delta
 * porque estos campos no mueven el agregado del padre.
 *
 * **Qué invalida** (§3.2): solo `entries(checklistId)`. No `tree()` ni
 * `libraryIndex()`, porque nada estructural cambió; y tampoco el prefijo
 * entero aunque el link sea sincronizado: lo que Odoo propaga entre copias es
 * `lv_episodes`, no la descripción ni los `[EXT]`.
 *
 * Los campos detrás de flag se filtran **acá**, no en el componente: que el
 * control no se renderice no alcanzaría si el body igual los mandara. Contra
 * el backend real —donde `rating` y las fechas no existen— el `PATCH` sale sin
 * ellos (ADR-004).
 */
export function useUpdateEntryMeta(checklistId: number, linkId: number) {
  const queryClient = useQueryClient()
  const queryKey = useMemo(() => listKeys.entries(checklistId), [checklistId])

  return useMutation<
    ListEntry,
    unknown,
    Partial<EntryMetaPatch>,
    MutationContext
  >({
    mutationFn: (patch) => {
      const body: UpdateLinkRequest = {}
      if ('notes' in patch) body.notes = patch.notes ?? null
      if (isFeatureEnabled('ratings') && 'rating' in patch) {
        body.rating = patch.rating ?? null
      }
      if (isFeatureEnabled('watchDates')) {
        if ('startedAt' in patch) body.startedAt = patch.startedAt ?? null
        if ('finishedAt' in patch) body.finishedAt = patch.finishedAt ?? null
      }
      return listsService.updateLink(linkId, body)
    },

    onMutate: async (patch) => {
      await queryClient.cancelQueries({ queryKey })
      const snapshot = queryClient.getQueryData<ListEntry[]>(queryKey)
      if (snapshot) {
        queryClient.setQueryData(
          queryKey,
          patchEntryFields(snapshot, linkId, patch),
        )
      }
      return { snapshot }
    },

    onError: (_error, _patch, context) => {
      if (context?.snapshot) {
        queryClient.setQueryData(queryKey, context.snapshot)
      }
      toast.error(t.lists.entry.metaError)
    },

    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey })
    },
  })
}
