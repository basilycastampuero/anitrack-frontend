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
import { LoginForm } from '@/features/auth/components/LoginForm'
import { OAuthButtons } from '@/features/auth/components/OAuthButtons'
import { paths, safeNext } from '@/router/paths'
import { t } from '@/i18n/en'

/** Página ensambla: layout + `?next=` (fallback home). Sin lógica propia. */
export default function LoginPage() {
  const [searchParams] = useSearchParams()
  const next = safeNext(searchParams.get('next'))

  return (
    <PageWrapper className="flex justify-center py-12">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>{t.auth.login.title}</CardTitle>
          <CardDescription>{t.auth.login.subtitle}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <LoginForm next={next} />
          <OAuthButtons next={next} />
        </CardContent>
        <CardFooter className="justify-center text-sm text-muted-foreground">
          {t.auth.login.noAccount}
          <Link
            to={paths.register}
            className="ml-1 font-medium text-foreground underline-offset-4 hover:underline"
          >
            {t.auth.login.registerLink}
          </Link>
        </CardFooter>
      </Card>
    </PageWrapper>
  )
}
