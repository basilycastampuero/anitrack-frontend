import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { authService } from '@/features/auth/services/auth.service'
import { authKeys } from '@/features/auth/hooks/queryKeys'
import { useSessionStore } from '@/store/sessionStore'
import { ApiError } from '@/types/api.types'

/**
 * Resuelve la sesión actual vía GET /auth/me y la sincroniza con el store.
 * Un 401 no se reintenta (la cookie no existe): status pasa a unauthenticated.
 */
export function useMe() {
  const setUser = useSessionStore((s) => s.setUser)
  const clearSession = useSessionStore((s) => s.clearSession)

  const query = useQuery({
    queryKey: authKeys.me(),
    queryFn: () => authService.me(),
    retry: (count, error) =>
      error instanceof ApiError && error.code === 'UNAUTHORIZED'
        ? false
        : count < 1,
    staleTime: 5 * 60_000,
  })

  useEffect(() => {
    // Gatear por estado, no por presencia de `data`: en v5 `data` sobrevive
    // a la transición a error (retiene el último valor bueno), así que
    // chequear `isError` primero evita reautenticar con un usuario vencido.
    if (query.isError) clearSession()
    else if (query.isSuccess) setUser(query.data)
  }, [query.isSuccess, query.isError, query.data, setUser, clearSession])

  return query
}
