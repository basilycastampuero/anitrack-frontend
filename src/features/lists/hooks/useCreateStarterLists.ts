import { useMutation, useQueryClient } from '@tanstack/react-query'
import { listsService } from '@/features/lists/services/lists.service'
import { listKeys } from '@/features/lists/hooks/queryKeys'
import { STARTER_LIST_KEYS } from '@/features/lists/constants'
import { t } from '@/i18n/en'

/**
 * Onboarding "starter lists" (doc 12 §3.5c, ADR-003): crea las cinco listas
 * sugeridas que emulan los estados de MAL como checklists normales, no como
 * un enum de dominio.
 *
 * Se crean con un `for...of` + `await`, en SECUENCIA y nunca en paralelo
 * (`Promise.all`): el mock (y el backend real) asignan `order` según
 * `siblings.length` en el momento en que llega cada `POST` — no es un campo
 * que el cliente envíe — así que crearlas a la vez dejaría el orden final a
 * merced de qué request resuelve primero, y "Watching" podría no terminar
 * siendo la primera lista del árbol.
 *
 * Es una única `useMutation` (no cinco) a propósito: así `onSettled` corre
 * UNA sola vez cuando termina el lote completo, no una vez por lista creada
 * (evitaría 5 refetches de `tree()` en cascada para un resultado que se
 * puede pintar de una).
 *
 * Si una creación falla a mitad de camino, el `for...of` corta ahí (la
 * excepción de `await` sale del loop) y NO se revierten las que ya se
 * crearon (decisión del plan, doc 12 §3.5c): deshacer lo hecho sería peor UX
 * que dejar, por ejemplo, tres listas armadas y mostrar el error de la
 * cuarta. Por eso la invalidación de `tree()` vive en `onSettled` (corre en
 * éxito Y en error, mismo criterio que `useUpdateChecklist`) — así el árbol
 * siempre refleja lo que el servidor efectivamente llegó a crear, en vez de
 * quedarse con la lista vacía que tenía en cache antes del intento.
 */
export function useCreateStarterLists() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      for (const key of STARTER_LIST_KEYS) {
        await listsService.createChecklist({ name: t.lists.starterLists[key] })
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: listKeys.tree() })
    },
  })
}
