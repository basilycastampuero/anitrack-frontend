import { ApiError } from '@/types/api.types'

/**
 * Mensaje de error a mostrar al usuario para una mutación de listas (doc 12
 * §3.5b: las cuatro operaciones necesitan estado de error visible). Un
 * `ApiError` reconocido manda su propio mensaje (el backend ya lo redacta
 * pensando en el usuario, p. ej. VALIDATION); cualquier otra cosa (error de
 * red, `ZodError` por drift de contrato) cae al mensaje genérico de la
 * operación — nunca se muestra un mensaje técnico crudo (mismo criterio que
 * `LoginForm`/`RegisterForm`, doc 12 §5, ficha 3.2).
 */
export function apiErrorMessage(error: unknown, fallback: string): string {
  return error instanceof ApiError ? error.message : fallback
}
