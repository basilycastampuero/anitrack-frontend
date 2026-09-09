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
import { useRegister } from '@/features/auth/hooks/useRegister'
import { ApiError } from '@/types/api.types'
import { t } from '@/i18n/en'

const registerFormSchema = z.object({
  name: z.string().min(1, t.auth.errors.nameRequired),
  email: z
    .string()
    .min(1, t.auth.errors.emailRequired)
    .email(t.auth.errors.emailInvalid),
  password: z.string().min(8, t.auth.errors.passwordTooShort),
})

type RegisterFormValues = z.infer<typeof registerFormSchema>

const REGISTER_FIELDS = ['name', 'email', 'password'] as const

/** Type guard: solo campos que el form realmente tiene pueden recibir el
 * error field-level que manda el backend (evita un `as` sin sustento). */
function isRegisterField(
  field: string,
): field is (typeof REGISTER_FIELDS)[number] {
  return (REGISTER_FIELDS as readonly string[]).includes(field)
}

interface RegisterFormProps {
  /** Destino tras un registro exitoso — el alta autentica de una (ADR-015). */
  next: string
}

/**
 * Formulario de alta (doc 12 §5, 3.2). Mapeo de errores del backend:
 * - `VALIDATION` con `field` (p. ej. email ya registrado) → error en ese campo.
 * - `VALIDATION` sin `field` → error a nivel de formulario.
 * - `FORBIDDEN` → caso específico de ADR-015 (`auth_signup.invitation_scope`
 *   en `b2b` en producción): mensaje de formulario explicando que el alta
 *   está deshabilitada, no un `ErrorState` genérico con un retry que no va a
 *   arreglar nada.
 * - Cualquier otro fallo → `ErrorState` con retry.
 */
export function RegisterForm({ next }: RegisterFormProps) {
  const navigate = useNavigate()
  const register = useRegister()
  // Ver LoginForm: `ErrorState` no usa el valor del error, y un `ZodError`
  // (200 con forma inesperada) no es `ApiError` — lo desconocido nunca debe
  // leerse como "no hay error" (#2 de la revisión).
  const [fatalError, setFatalError] = useState(false)

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerFormSchema),
    defaultValues: { name: '', email: '', password: '' },
  })

  function onSubmit(values: RegisterFormValues) {
    setFatalError(false)
    register.mutate(values, {
      onSuccess: () => navigate(next, { replace: true }),
      onError: (error) => {
        // Solo los casos de ApiError conocidos y manejables se resuelven como
        // error de formulario. Todo lo demás (ApiError no reconocido,
        // ZodError por drift de contrato, error de red) cae al fatal error:
        // lo desconocido nunca se trata como éxito.
        if (error instanceof ApiError) {
          if (error.code === 'VALIDATION' && error.field && isRegisterField(error.field)) {
            form.setError(error.field, { message: error.message })
            return
          }
          if (error.code === 'VALIDATION') {
            form.setError('root', { message: error.message })
            return
          }
          if (error.code === 'FORBIDDEN') {
            form.setError('root', {
              message: t.auth.errors.registrationUnavailable,
            })
            return
          }
        }
        setFatalError(true)
      },
    })
  }

  if (fatalError) {
    return <ErrorState onRetry={() => setFatalError(false)} />
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
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t.auth.nameLabel}</FormLabel>
              <FormControl>
                <Input type="text" autoComplete="name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="email"
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
                  autoComplete="new-password"
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
        <Button type="submit" className="w-full" disabled={register.isPending}>
          {register.isPending
            ? t.auth.register.submitting
            : t.auth.register.submit}
        </Button>
      </form>
    </Form>
  )
}
