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
  /**
   * El cache tal como lo dejó el último valor **confirmado por el servidor**.
   * Vive mientras la cadena de commits siga viva y se limpia recién cuando
   * queda ociosa, no cuando arranca un commit: con `scope`, un commit encolado
   * no corre su `onMutate` hasta que liquida el anterior, así que consumirlo
   * ahí dejaba ráfagas enteras sin a qué volver.
   */
  snapshot?: ListEntry[]
  timer?: ReturnType<typeof setTimeout>
  /** Último valor que el usuario pidió y todavía no salió. */
  pending?: number
  inFlight: boolean
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
 * puede saber qué otras carpetas quedaron sucias.
 *
 * Contra la ráfaga del long-press, tres defensas (§4.3):
 *
 * - `scope.id` serializa las mutaciones del mismo entry, así que una respuesta
 *   vieja no puede pisar a una nueva. Como el contrato manda el valor
 *   **absoluto**, además son idempotentes en cualquier orden.
 * - El cache se escribe en cada click (feedback inmediato) pero el commit se
 *   debouncea: veinte pulsaciones terminan siendo un `PATCH`.
 * - **Nunca hay más de un commit en vuelo.** Si el debounce vence con uno
 *   todavía andando, el valor queda pendiente y lo manda `onSettled` cuando
 *   el anterior liquida. Sin esto se encolaban commits cuyo `onMutate` no
 *   había corrido, y el snapshot de rollback se desalineaba: el rollback podía
 *   retroceder más de lo debido, o una mutación quedarse sin snapshot y dejar
 *   en pantalla un valor que el servidor nunca aceptó.
 */
export function useUpdateEntryProgress(
  checklistId: number,
  entry: VersionEntry,
) {
  const queryClient = useQueryClient()
  const queryKey = useMemo(() => listKeys.entries(checklistId), [checklistId])
  const burst = useRef<Burst>({ inFlight: false })
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
      return { snapshot: burst.current.snapshot }
    },

    // Se restaura el array ENTERO, no la fila: mismo criterio que
    // `useUpdateChecklist`. Y el toast está en la CA del plan, no es adorno —
    // sin él la barra vuelve atrás sola y el usuario no sabe por qué.
    onError: (_error, _watchedEpisodes, context) => {
      if (context?.snapshot) {
        queryClient.setQueryData(queryKey, context.snapshot)
      }
      // La cadena se aborta entera: lo que quedaba pendiente nunca llegó al
      // servidor, así que mandarlo después volvería a separar la pantalla de
      // lo que el usuario acaba de ver revertirse.
      if (burst.current.timer) clearTimeout(burst.current.timer)
      burst.current = { inFlight: false }
      toast.error(t.lists.entry.progressError)
    },

    onSettled: () => {
      burst.current.inFlight = false

      // Commit de arrastre: los clicks que entraron mientras este estaba en
      // vuelo salen ahora, en serie y no en paralelo.
      const trailing = burst.current.pending
      if (trailing != null && burst.current.timer == null) {
        burst.current.pending = undefined
        burst.current.inFlight = true
        mutate(trailing)
        return
      }

      if (burst.current.timer == null && burst.current.pending == null) {
        burst.current.snapshot = undefined
      }
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

      burst.current.pending = watchedEpisodes
      if (burst.current.timer) clearTimeout(burst.current.timer)
      burst.current.timer = setTimeout(() => {
        burst.current.timer = undefined
        if (burst.current.inFlight) return
        const value = burst.current.pending
        if (value == null) return
        burst.current.pending = undefined
        burst.current.inFlight = true
        mutate(value)
      }, COMMIT_DELAY_MS)
    },
    [queryClient, queryKey, linkId, mutate],
  )

  useEffect(
    () => () => {
      const pending = burst.current
      if (pending.timer) clearTimeout(pending.timer)
      const value = pending.pending
      burst.current = { inFlight: false }
      if (value == null) return
      // Desmontar con un commit pendiente (cambiar de carpeta justo después de
      // tocar +) no puede perder el episodio que el usuario ya vio subir. Va
      // por el service y no por `mutate` porque el observer ya no existe y sus
      // callbacks no correrían, así que el aviso de fallo se da acá a mano.
      void (async () => {
        try {
          await listsService.updateLink(linkId, { watchedEpisodes: value })
        } catch {
          toast.error(t.lists.entry.progressError)
        }
        try {
          // `refetchType: 'all'` y no el default `'active'`: la carpeta que
          // quedó con el valor optimista ya no está montada, y marcarla stale
          // sin refetchear hace que al volver se vea un frame con el número
          // viejo.
          await queryClient.invalidateQueries({
            queryKey: listKeys.all,
            refetchType: 'all',
          })
        } catch {
          // El cliente puede haberse desmontado con la app entera.
        }
      })()
    },
    [linkId, queryClient],
  )

  return { setProgress, isPending }
}
