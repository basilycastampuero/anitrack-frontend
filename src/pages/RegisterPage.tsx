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
import { RegisterForm } from '@/features/auth/components/RegisterForm'
import { paths } from '@/router/paths'
import { t } from '@/i18n/en'

/**
 * Página ensambla: layout + `?next=` (fallback home). El registro autentica
 * de una (ADR-015), así que el destino post-alta se resuelve igual que login.
 */
export default function RegisterPage() {
  const [searchParams] = useSearchParams()
  const next = searchParams.get('next') || paths.home

  return (
    <PageWrapper className="flex justify-center py-12">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>{t.auth.register.title}</CardTitle>
          <CardDescription>{t.auth.register.subtitle}</CardDescription>
        </CardHeader>
        <CardContent>
          <RegisterForm next={next} />
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
