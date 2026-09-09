import { type z } from 'zod'
import type { userSessionSchema } from '@/features/auth/services/schemas'

export type UserSession = z.infer<typeof userSessionSchema>

export interface LoginRequest {
  login: string
  password: string
}

/**
 * Body de `POST /auth/register`. Ojo: a diferencia de `LoginRequest`, el campo
 * es `email`, no `login` — verificado contra el backend real (ADR-015/B1).
 */
export interface RegisterRequest {
  name: string
  email: string
  password: string
}
