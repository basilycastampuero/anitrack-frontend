import { useMutation, useQueryClient } from '@tanstack/react-query'
import { authService } from '@/features/auth/services/auth.service'
import { authKeys } from '@/features/auth/hooks/queryKeys'
import { useSessionStore } from '@/store/sessionStore'
import type { RegisterRequest } from '@/features/auth/types'

/**
 * Alta de cuenta (doc 12 §5, 3.1; ADR-015). El backend autentica en el mismo
 * request, así que el éxito se maneja igual que `useLogin`: sesión + cache de
 * `me` sembrados sin refetch adicional.
 */
export function useRegister() {
  const setUser = useSessionStore((s) => s.setUser)
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (body: RegisterRequest) => authService.register(body),
    onSuccess: (user) => {
      setUser(user)
      queryClient.setQueryData(authKeys.me(), user)
    },
  })
}
