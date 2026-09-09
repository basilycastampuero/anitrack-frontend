import { Link } from 'react-router-dom'
import { PageWrapper } from '@/components/layout/PageWrapper'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ErrorState } from '@/components/common/ErrorState'
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton'
import { useAuthCallback } from '@/features/auth/hooks/useAuthCallback'
import { paths } from '@/router/paths'
import { t } from '@/i18n/en'

/**
 * Retorno del flujo OAuth (doc 06). Página ensambla; toda la decisión de
 * cuándo invalidar `me` y cuándo navegar vive en `useAuthCallback`.
 */
export default function AuthCallbackPage() {
  const { status, errorCode } = useAuthCallback()

  if (status === 'error-param') {
    return (
      <PageWrapper className="flex justify-center py-12">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle>{t.auth.callback.errorTitle}</CardTitle>
            <CardDescription>
              {errorCode === 'access_denied'
                ? t.auth.callback.accessDenied
                : t.auth.callback.genericError}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link to={paths.login}>{t.auth.callback.backToLogin}</Link>
            </Button>
          </CardContent>
        </Card>
      </PageWrapper>
    )
  }

  if (status === 'session-error') {
    return (
      <PageWrapper className="py-12">
        <ErrorState
          title={t.auth.callback.errorTitle}
          description={t.auth.callback.genericError}
        />
      </PageWrapper>
    )
  }

  return (
    <PageWrapper className="py-12">
      <p className="mb-4 text-center text-sm text-muted-foreground">
        {t.auth.callback.loadingTitle}
      </p>
      <LoadingSkeleton variant="list-rows" count={1} className="mx-auto max-w-sm" />
    </PageWrapper>
  )
}
