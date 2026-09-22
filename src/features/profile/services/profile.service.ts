import { z } from 'zod'
import { http } from '@/lib/http'
import { listEntrySchema } from '@/features/lists/services/schemas'
import { publicProfileSchema } from '@/features/profile/services/schemas'
import type { ListEntry } from '@/features/lists/types'
import type { PublicProfile } from '@/features/profile/types'

const profileResponseSchema = z.object({ profile: publicProfileSchema })
const entriesResponseSchema = z.object({ items: z.array(listEntrySchema) })

export const profileService = {
  /** `GET /users/:id/profile` (doc 04). Público: no necesita sesión. */
  async getProfile(userId: number): Promise<PublicProfile> {
    const { data } = await http.get(`/users/${userId}/profile`)
    return profileResponseSchema.parse(data).profile
  },

  /**
   * `GET /users/:id/checklists/:checklistId/entries` (doc 04). Una lista que
   * no está publicada responde `404`, no `403`: el frontend no puede —ni
   * quiere— distinguir "privada" de "no existe".
   */
  async getPublicEntries(
    userId: number,
    checklistId: number,
  ): Promise<ListEntry[]> {
    const { data } = await http.get(
      `/users/${userId}/checklists/${checklistId}/entries`,
    )
    return entriesResponseSchema.parse(data).items
  },
}
