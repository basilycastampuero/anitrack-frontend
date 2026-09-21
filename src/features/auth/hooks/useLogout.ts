import { useMutation, useQueryClient } from '@tanstack/react-query'
import { authService } from '@/features/auth/services/auth.service'
import { authKeys } from '@/features/auth/hooks/queryKeys'
import { listKeys } from '@/features/lists/hooks/queryKeys'
import { useSessionStore } from '@/store/sessionStore'

/**
 * Logout (doc 12 §3). Limpiar `sessionStore` no alcanza: TanStack Query se
 * queda con las listas y el perfil del usuario saliente en memoria, y si otro
 * usuario entra en la misma pestaña los vería un instante antes del refetch.
 * Por eso se vacía también el cache privado (`removeQueries`, no invalidate:
 * no queremos que dispare un refetch con la sesión ya cerrada).
 *
 * Se hace en `onSettled`, no en `onSuccess`: si el POST /auth/logout falla
 * (red caída, sesión ya vencida del lado del servidor) igual queremos que el
 * usuario quede deslogueado y sin datos privados en el cliente — dejarlo
 * "logueado" localmente tras pedir explícitamente salir es peor que limpiar
 * de más.
 *
 * El prefijo `profile` que menciona el doc 12 **no** se limpia acá, y ahora
 * que ese feature sí tiene queries (3.10) la decisión es explícita: un perfil
 * público es dato público, visible sin sesión, así que removerlo solo costaría
 * un refetch de algo que el visitante puede ver igual. Solo se vacía el cache
 * privado (doc 15 §3.5).
 */
export function useLogout() {
  const clearSession = useSessionStore((s) => s.clearSession)
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => authService.logout(),
    onSettled: () => {
      clearSession()
      queryClient.removeQueries({ queryKey: authKeys.all })
      queryClient.removeQueries({ queryKey: listKeys.all })
    },
  })
}
