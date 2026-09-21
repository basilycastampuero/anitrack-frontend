import { useQuery } from '@tanstack/react-query'
import { profileService } from '@/features/profile/services/profile.service'
import { profileKeys } from '@/features/profile/hooks/queryKeys'

/**
 * Perfil público de un usuario. A diferencia de todo lo de `lists`, **no** se
 * gatea por sesión: la ruta es pública y un visitante anónimo tiene que poder
 * verla. `userId` llega como `number | null` porque el caller lo deriva del
 * param de ruta con `parseIdParam` (mismo criterio que el resto).
 */
export function useProfile(userId: number | null) {
  return useQuery({
    queryKey: profileKeys.detail(userId ?? -1),
    queryFn: () => profileService.getProfile(userId!),
    enabled: userId != null,
  })
}
