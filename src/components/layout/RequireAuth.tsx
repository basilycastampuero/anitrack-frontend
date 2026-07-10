import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useSessionStore } from '@/store/sessionStore'
import { paths } from '@/router/paths'
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton'
import { PageWrapper } from '@/components/layout/PageWrapper'

/**
 * Guard de rutas privadas (doc 06). Mientras la sesión no está resuelta muestra
 * skeleton; si no hay sesión redirige a login con `next` para volver después.
 */
export function RequireAuth() {
  const status = useSessionStore((s) => s.status)
  const location = useLocation()

  if (status === 'idle') {
    return (
      <PageWrapper>
        <LoadingSkeleton variant="list-rows" />
      </PageWrapper>
    )
  }

  if (status === 'unauthenticated') {
    const next = encodeURIComponent(location.pathname + location.search)
    return <Navigate to={`${paths.login}?next=${next}`} replace />
  }

  return <Outlet />
}
