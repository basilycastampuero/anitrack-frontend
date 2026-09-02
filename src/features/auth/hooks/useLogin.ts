import { useMutation, useQueryClient } from '@tanstack/react-query'
import { authService } from '@/features/auth/services/auth.service'
import { authKeys } from '@/features/auth/hooks/queryKeys'
import { useSessionStore } from '@/store/sessionStore'
import type { LoginRequest } from '@/features/auth/types'

/**
 * Login (doc 12 §5, 3.1). En éxito fija la sesión y siembra `authKeys.me()`
 * con la misma respuesta para evitar un refetch inmediato de `GET /auth/me`.
 * No redirige: la página decide el destino según `?next=`.
 */
export function useLogin() {
  const setUser = useSessionStore((s) => s.setUser)
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (body: LoginRequest) => authService.login(body),
    onSuccess: (user) => {
      setUser(user)
      queryClient.setQueryData(authKeys.me(), user)
    },
  })
}
