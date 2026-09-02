import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { ErrorState } from '@/components/common/ErrorState'
import { useLogin } from '@/features/auth/hooks/useLogin'
import { ApiError } from '@/types/api.types'
import { t } from '@/i18n/en'

// Schema del FORM, distinto del contrato (doc 12 §5, ficha 3.2): valida
// formato de email y presencia de password del lado cliente antes de pegarle
// a la API.
const loginFormSchema = z.object({
  login: z
    .string()
    .min(1, t.auth.errors.emailRequired)
    .email(t.auth.errors.emailInvalid),
  password: z.string().min(1, t.auth.errors.passwordRequired),
})

type LoginFormValues = z.infer<typeof loginFormSchema>

interface LoginFormProps {
  /** Destino tras un login exitoso (resuelto por la página desde `?next=`). */
  next: string
}

/**
 * Formulario de login (doc 12 §5, 3.2). `UNAUTHORIZED` se mapea a un error de
 * formulario con mensaje genérico — nunca revelamos si el email existe o no
 * (no le regalamos enumeración de usuarios a nadie). Cualquier otro fallo
 * (red, 500, etc.) reemplaza el form por un `ErrorState` con retry.
 */
export function LoginForm({ next }: LoginFormProps) {
  const navigate = useNavigate()
  const login = useLogin()
  const [fatalError, setFatalError] = useState<ApiError | null>(null)

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: { login: '', password: '' },
  })

  function onSubmit(values: LoginFormValues) {
    setFatalError(null)
    login.mutate(values, {
      onSuccess: () => navigate(next, { replace: true }),
      onError: (error) => {
        if (error instanceof ApiError && error.code === 'UNAUTHORIZED') {
          form.setError('root', { message: t.auth.errors.invalidCredentials })
          return
        }
        setFatalError(error instanceof ApiError ? error : null)
      },
    })
  }

  if (fatalError) {
    return <ErrorState onRetry={() => setFatalError(null)} />
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-4"
        noValidate
      >
        <FormField
          control={form.control}
          name="login"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t.auth.emailLabel}</FormLabel>
              <FormControl>
                <Input type="email" autoComplete="email" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t.auth.passwordLabel}</FormLabel>
              <FormControl>
                <Input
                  type="password"
                  autoComplete="current-password"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {form.formState.errors.root && (
          <p role="alert" className="text-sm text-destructive">
            {form.formState.errors.root.message}
          </p>
        )}
        <Button type="submit" className="w-full" disabled={login.isPending}>
          {login.isPending ? t.auth.login.submitting : t.auth.login.submit}
        </Button>
      </form>
    </Form>
  )
}
