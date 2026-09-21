import { useQuery } from '@tanstack/react-query'
import { profileService } from '@/features/profile/services/profile.service'
import { profileKeys } from '@/features/profile/hooks/queryKeys'

/** Entries de una lista publicada de otro usuario (modo lectura). */
export function usePublicEntries(
  userId: number | null,
  checklistId: number | null,
) {
  return useQuery({
    queryKey: profileKeys.entries(userId ?? -1, checklistId ?? -1),
    queryFn: () => profileService.getPublicEntries(userId!, checklistId!),
    enabled: userId != null && checklistId != null,
  })
}
