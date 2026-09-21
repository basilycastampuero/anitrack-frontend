import { z } from 'zod'
import { checklistNodeSchema } from '@/features/lists/services/schemas'

/**
 * Perfil público (doc 04). Reusa `checklistNodeSchema` de `lists` en vez de
 * redeclarar el árbol: `publishedChecklists` es la misma forma, podada a los
 * nodos publicados del lado del backend.
 */
export const publicProfileSchema = z.object({
  id: z.number(),
  name: z.string(),
  avatarUrl: z.string().nullable(),
  stats: z.object({
    totalEntries: z.number(),
    totalEpisodesWatched: z.number(),
    byContentType: z.object({ games: z.number(), videos: z.number() }),
  }),
  publishedChecklists: z.array(checklistNodeSchema),
})
