import { z } from 'zod'
import { http } from '@/lib/http'
import { checklistNodeSchema, listEntrySchema } from '@/features/lists/services/schemas'
import type {
  ChecklistNode,
  ListEntry,
  LibraryIndex,
} from '@/features/lists/types'

const libraryIndexSchema = z.object({
  versionIds: z.array(z.number()),
  franchiseIds: z.array(z.number()),
})

export const listsService = {
  async getChecklists(): Promise<ChecklistNode[]> {
    const { data } = await http.get('/me/checklists')
    return z.object({ items: z.array(checklistNodeSchema) }).parse(data).items
  },

  async getEntries(checklistId: number): Promise<ListEntry[]> {
    const { data } = await http.get(`/me/checklists/${checklistId}/entries`)
    return z.object({ items: z.array(listEntrySchema) }).parse(data).items
  },

  async getLibraryIndex(): Promise<LibraryIndex> {
    const { data } = await http.get('/me/library-index')
    return libraryIndexSchema.parse(data)
  },
}
