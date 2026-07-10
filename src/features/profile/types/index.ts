import type { ChecklistNode } from '@/features/lists/types'

/** Perfil público (doc 04) — solo datos publicados. */
export interface PublicProfile {
  id: number
  name: string
  avatarUrl: string | null
  stats: {
    totalEntries: number
    totalEpisodesWatched: number
    byContentType: { games: number; videos: number }
  }
  publishedChecklists: ChecklistNode[]
}
