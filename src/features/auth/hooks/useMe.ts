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
    if (query.data) setUser(query.data)
    else if (query.isError) clearSession()
  }, [query.data, query.isError, setUser, clearSession])

  return query
}
