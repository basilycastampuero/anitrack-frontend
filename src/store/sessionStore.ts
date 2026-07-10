import { create } from 'zustand'
import type { UserSession } from '@/features/auth/types'

type SessionStatus = 'idle' | 'authenticated' | 'unauthenticated'

interface SessionState {
  user: UserSession | null
  status: SessionStatus
  setUser: (user: UserSession) => void
  clearSession: () => void
}

/**
 * Sesión del usuario en memoria (ADR-005: la cookie HttpOnly es la verdad;
 * el store solo cachea el perfil resuelto por GET /auth/me). El interceptor 401
 * llama clearSession() para reflejar el cierre de sesión en la UI.
 */
export const useSessionStore = create<SessionState>((set) => ({
  user: null,
  status: 'idle',
  setUser: (user) => set({ user, status: 'authenticated' }),
  clearSession: () => set({ user: null, status: 'unauthenticated' }),
}))
