import { http } from '@/lib/http'
import { userEnvelopeSchema } from '@/features/auth/services/schemas'
import type {
  LoginRequest,
  RegisterRequest,
  UserSession,
} from '@/features/auth/types'

export const authService = {
  async me(): Promise<UserSession> {
    const { data } = await http.get('/auth/me')
    return userEnvelopeSchema.parse(data).user
  },

  async login(body: LoginRequest): Promise<UserSession> {
    const { data } = await http.post('/auth/login', body)
    return userEnvelopeSchema.parse(data).user
  },

  async logout(): Promise<void> {
    await http.post('/auth/logout')
  },

  /** El registro autentica de una: la respuesta ya trae la sesión (ADR-015). */
  async register(body: RegisterRequest): Promise<UserSession> {
    const { data } = await http.post('/auth/register', body)
    return userEnvelopeSchema.parse(data).user
  },
}
