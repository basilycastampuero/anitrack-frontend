import { type z } from 'zod'
import type { userSessionSchema } from '@/features/auth/services/schemas'

export type UserSession = z.infer<typeof userSessionSchema>

export interface LoginRequest {
  login: string
  password: string
}
