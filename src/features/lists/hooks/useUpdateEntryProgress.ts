import { useCallback, useEffect, useMemo, useRef } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { listsService } from '@/features/lists/services/lists.service'
import { listKeys } from '@/features/lists/hooks/queryKeys'
import { patchEntryProgress } from '@/features/lists/utils/entryTree'
import { t } from '@/i18n/en'
import type { ListEntry, VersionEntry } from '@/features/lists/types'

/** Cuánto espera el commit después del último click de una ráfaga. */
const COMMIT_DELAY_MS = 400

interface Burst {
  /** El cache tal como estaba en el PRIMER click de la ráfaga. */
  snapshot?: ListEntry[]
  timer?: ReturnType<typeof setTimeout>
  value?: number
}

interface MutationContext {
  snapshot: ListEntry[] | undefined
}

/**
 * Subir/bajar episodios de un entry con optimistic update (tarea 3.7).
 *
 * **Qué invalida** (§3.2 del doc 15): `entries(checklistId)` siempre y, si el
 * link es sincronizado, el prefijo entero `listKeys.all`. **Qué no**:
 * `tree()`, porque `linkCount` no cambia al mover episodios, ni
 * `libraryIndex()`, porque el conjunto de versiones vinculadas tampoco.
 *
 * El caso sincronizado usa el martillo a propósito: el contrato expone
 * `isSynced: boolean` pero no los ids de las copias, así que el cliente no
 * puede saber qué otras carpetas quedaron sucias. El costo es un refetch por
 * query activa; la alternativa era agregar `syncedWithLinkIds` al contrato.
 *
 * Contra la ráfaga del long-press, dos defensas (§4.3):
 *
 * - `scope.id` serializa las mutaciones del mismo entry, así que nunca hay dos
 *   en vuelo sobre el mismo link y una respuesta vieja no puede pisar a una
 *   nueva. Como el contrato manda el valor **absoluto**, además son
 *   idempotentes en cualquier orden.
 * - El cache se escribe en cada click (feedback inmediato) pero el commit se
 *   debouncea: veinte pulsaciones terminan siendo un `PATCH` con el valor
 *   final. El snapshot de rollback se toma en el primer click de la ráfaga,
 *   no en cada uno, o revertir dejaría el valor intermedio.
 */
export function useUpdateEntryProgress(
  checklistId: number,
  entry: VersionEntry,
) {
  const queryClient = useQueryClient()
  const queryKey = useMemo(() => listKeys.entries(checklistId), [checklistId])
  const burst = useRef<Burst>({})
  const { linkId } = entry
  const { isSynced } = entry.version

  const { mutate, isPending } = useMutation<
    ListEntry,
    unknown,
    number,
    MutationContext
  >({
    scope: { id: `entry-${linkId}` },
    mutationFn: (watchedEpisodes) =>
      listsService.updateLink(linkId, { watchedEpisodes }),

    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey })
      const snapshot = burst.current.snapshot
      burst.current.snapshot = undefined
      return { snapshot }
    },

    // Se restaura el array ENTERO, no la fila: mismo criterio que
    // `useUpdateChecklist`. Y el toast está en la CA del plan, no es adorno —
    // sin él la barra vuelve atrás sola y el usuario no sabe por qué.
    onError: (_error, _watchedEpisodes, context) => {
      if (context?.snapshot) {
        queryClient.setQueryData(queryKey, context.snapshot)
      }
      toast.error(t.lists.entry.progressError)
    },

    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey })
      if (isSynced) {
        void queryClient.invalidateQueries({ queryKey: listKeys.all })
      }
    },
  })

  const setProgress = useCallback(
    (watchedEpisodes: number) => {
      const current = queryClient.getQueryData<ListEntry[]>(queryKey)

      if (burst.current.snapshot === undefined) {
        // Cancelar acá y no solo en `onMutate`: entre el primer click y el
        // commit pasan 400 ms, tiempo de sobra para que un refetch en vuelo
        // aterrice y pise el valor optimista.
        void queryClient.cancelQueries({ queryKey })
        burst.current.snapshot = current
      }

      if (current) {
        queryClient.setQueryData(
          queryKey,
          patchEntryProgress(current, linkId, watchedEpisodes),
        )
      }

      burst.current.value = watchedEpisodes
      if (burst.current.timer) clearTimeout(burst.current.timer)
      burst.current.timer = setTimeout(() => {
        burst.current.timer = undefined
        mutate(watchedEpisodes)
      }, COMMIT_DELAY_MS)
    },
    [queryClient, queryKey, linkId, mutate],
  )

  useEffect(
    () => () => {
      const pending = burst.current
      if (!pending.timer) return
      clearTimeout(pending.timer)
      const value = pending.value
      burst.current = {}
      if (value == null) return
      // Desmontar con un commit pendiente (cambiar de carpeta justo después
      // de tocar +) no puede perder el episodio que el usuario ya vio subir.
      // Va por el service y no por `mutate` porque el observer ya no existe y
      // sus callbacks no correrían; sin UI que revertir, la reconciliación la
      // hace la invalidación, que no depende del componente.
      void listsService
        .updateLink(linkId, { watchedEpisodes: value })
        .catch(() => undefined)
        .finally(() => {
          void queryClient.invalidateQueries({ queryKey: listKeys.all })
        })
    },
    [linkId, queryClient],
  )

  return { setProgress, isPending }
}
