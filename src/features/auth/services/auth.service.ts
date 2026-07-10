import { http } from '@/lib/http'
import {
  meResponseSchema,
  userSessionSchema,
} from '@/features/auth/services/schemas'
import { z } from 'zod'
import type { LoginRequest, UserSession } from '@/features/auth/types'

export const authService = {
  async me(): Promise<UserSession> {
    const { data } = await http.get('/auth/me')
    return meResponseSchema.parse(data).user
  },

  async login(body: LoginRequest): Promise<UserSession> {
    const { data } = await http.post('/auth/login', body)
    return z.object({ user: userSessionSchema }).parse(data).user
  },

  async logout(): Promise<void> {
    await http.post('/auth/logout')
  },
}
