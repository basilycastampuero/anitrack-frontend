import { Link, useSearchParams } from 'react-router-dom'
import { PageWrapper } from '@/components/layout/PageWrapper'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { OAuthButtons } from '@/features/auth/components/OAuthButtons'
import { RegisterForm } from '@/features/auth/components/RegisterForm'
import { paths, safeNext } from '@/router/paths'
import { t } from '@/i18n/en'

/**
 * Página ensambla: layout + `?next=` (fallback home). El registro autentica
 * de una (ADR-015), así que el destino post-alta se resuelve igual que login.
 */
export default function RegisterPage() {
  const [searchParams] = useSearchParams()
  const next = safeNext(searchParams.get('next'))

  return (
    <PageWrapper className="flex justify-center py-12">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>{t.auth.register.title}</CardTitle>
          <CardDescription>{t.auth.register.subtitle}</CardDescription>
        </CardHeader>
        <CardContent>
          <RegisterForm next={next} />
          {/* Mismo bloque que `LoginPage`: en el 3a quedó solo ahí, así que
              quien llegaba a registrarse no veía la opción social que sí veía
              al iniciar sesión. El alta por OAuth no necesita pasar antes por
              el formulario — `_auth_oauth_signin` crea el usuario si no
              existe. */}
          <OAuthButtons next={next} />
        </CardContent>
        <CardFooter className="justify-center text-sm text-muted-foreground">
          {t.auth.register.haveAccount}
          <Link
            to={paths.login}
            className="ml-1 font-medium text-foreground underline-offset-4 hover:underline"
          >
            {t.auth.register.loginLink}
          </Link>
        </CardFooter>
      </Card>
    </PageWrapper>
  )
}
