import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useMe } from '@/features/auth/hooks/useMe'
import { authKeys } from '@/features/auth/hooks/queryKeys'
import { safeNext } from '@/router/paths'

type AuthCallbackStatus = 'loading' | 'error-param' | 'session-error'

interface AuthCallbackResult {
  status: AuthCallbackStatus
  /** El valor crudo de `?error=` (solo tiene sentido con status 'error-param'). */
  errorCode: string | null
}

/**
 * Lógica de `/auth/callback` (doc 12 §5, 3.3a). Vive en un hook, no en la
 * página: decide cuándo invalidar sesión y cuándo navegar, que es lógica de
 * negocio, no ensamblaje.
 *
 * Sin `?error=`: el backend OAuth ya puso la cookie antes de redirigir acá,
 * así que se invalida `authKeys.me()` (la query ya está montada por el
 * bootstrap de `RootLayout`, esto solo la fuerza a refetchear) y se espera a
 * que resuelva antes de navegar a `?next=` (fallback home).
 *
 * Con `?error=`, no se toca la sesión: la página muestra su propio mensaje
 * (CA: `access_denied` es un caso con copy dedicado) con un link de vuelta.
 */
export function useAuthCallback(): AuthCallbackResult {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const errorCode = searchParams.get('error')
  const next = safeNext(searchParams.get('next'))

  useEffect(() => {
    if (!errorCode) {
      void queryClient.invalidateQueries({ queryKey: authKeys.me() })
    }
    // Solo una vez al montar: es el punto de entrada del callback OAuth, no
    // una pantalla donde `next`/`errorCode` deban re-disparar la invalidación.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const me = useMe()
  // `me.isSuccess` es `true` desde el primer render si `authKeys.me()` ya
  // tenía data cacheada (p. ej. de una sesión previa resuelta por
  // `RootLayout`) — `invalidateQueries` la marca stale y dispara un refetch,
  // no la borra. Eso no prueba que la sesión de ESTA página haya resuelto
  // nada: hace falta `isFetchedAfterMount` para saber que el fetch ocurrió
  // durante este mount, no que es un resabio de cache (#3 de la revisión).
  const resolvedThisMount = me.isFetchedAfterMount

  useEffect(() => {
    if (!errorCode && me.isSuccess && resolvedThisMount) {
      navigate(next, { replace: true })
    }
  }, [errorCode, me.isSuccess, resolvedThisMount, navigate, next])

  if (errorCode) return { status: 'error-param', errorCode }
  if (resolvedThisMount && me.isError) return { status: 'session-error', errorCode: null }
  return { status: 'loading', errorCode: null }
}
