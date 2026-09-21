import { z } from 'zod'
import { http } from '@/lib/http'
import {
  checklistNodeSchema,
  listEntrySchema,
} from '@/features/lists/services/schemas'
import type {
  ChecklistNode,
  ListEntry,
  LibraryIndex,
  CreateChecklistRequest,
  UpdateChecklistRequest,
  UpdateLinkRequest,
} from '@/features/lists/types'

const libraryIndexSchema = z.object({
  versionIds: z.array(z.number()),
  franchiseIds: z.array(z.number()),
})

const checklistResponseSchema = z.object({ checklist: checklistNodeSchema })
const entryResponseSchema = z.object({ entry: listEntrySchema })

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

  async createChecklist(body: CreateChecklistRequest): Promise<ChecklistNode> {
    const { data } = await http.post('/me/checklists', body)
    return checklistResponseSchema.parse(data).checklist
  },

  async updateChecklist(
    id: number,
    body: UpdateChecklistRequest,
  ): Promise<ChecklistNode> {
    const { data } = await http.patch(`/me/checklists/${id}`, body)
    return checklistResponseSchema.parse(data).checklist
  },

  async deleteChecklist(id: number): Promise<void> {
    await http.delete(`/me/checklists/${id}`)
  },

  /**
   * `PATCH /me/links/:id` (doc 04). Devuelve el `ListEntry` completo con los
   * agregados ya recalculados por el backend, que es lo que reconcilia el
   * `onSettled` del optimistic update de 3.7 — el patch optimista es una
   * suposición del cliente, esto es la verdad del servidor.
   */
  async updateLink(id: number, body: UpdateLinkRequest): Promise<ListEntry> {
    const { data } = await http.patch(`/me/links/${id}`, body)
    return entryResponseSchema.parse(data).entry
  },
}
