import { z } from 'zod'
import { http } from '@/lib/http'
import {
  checklistNodeSchema,
  existingLinkSchema,
  listEntrySchema,
} from '@/features/lists/services/schemas'
import { ApiError } from '@/types/api.types'
import { AlreadyLinkedError } from '@/features/lists/types'
import type {
  ChecklistNode,
  ListEntry,
  LibraryIndex,
  CreateChecklistRequest,
  CreateLinkRequest,
  UpdateChecklistRequest,
  UpdateLinkRequest,
} from '@/features/lists/types'

/**
 * Exportados (deuda de B5, doc 13): el checkpoint de contrato de B10 corre
 * los schemas del frontend contra el backend real desde afuera de este
 * archivo y necesita reconstruirlos, no duplicarlos a mano.
 */
export const libraryIndexSchema = z.object({
  versionIds: z.array(z.number()),
  franchiseIds: z.array(z.number()),
})

export const checklistResponseSchema = z.object({
  checklist: checklistNodeSchema,
})
const entryResponseSchema = z.object({ entry: listEntrySchema })

/**
 * Traduce el `409 ALREADY_LINKED` crudo al error tipado que consume el wizard
 * (doc 15 §3.3). Cualquier otro error pasa de largo sin tocarse. Si el payload
 * no valida —drift de contrato— se devuelve el `ApiError` original en vez de
 * romper: el wizard degrada a "agregar igual / cancelar".
 */
function withParsedConflict(error: unknown): unknown {
  if (!(error instanceof ApiError) || error.code !== 'ALREADY_LINKED')
    return error
  const parsed = z.array(existingLinkSchema).safeParse(error.detail)
  return parsed.success ? new AlreadyLinkedError(error, parsed.data) : error
}

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
  /**
   * `POST /me/links` (doc 04). El `409` sale de acá ya parseado como
   * `AlreadyLinkedError`; el resto de los errores, como `ApiError` normal.
   */
  async createLink(body: CreateLinkRequest): Promise<ListEntry> {
    try {
      const { data } = await http.post('/me/links', body)
      return entryResponseSchema.parse(data).entry
    } catch (error) {
      throw withParsedConflict(error)
    }
  },

  /**
   * `DELETE /me/links/:id` (doc 04). Es lo que ejecuta el "deshacer" del toast:
   * el backend borra también el franchise-link padre si se queda sin hijos
   * (regla de `action_remove`), así que deshacer no deja un grupo vacío.
   */
  async deleteLink(id: number): Promise<void> {
    await http.delete(`/me/links/${id}`)
  },

  async updateLink(id: number, body: UpdateLinkRequest): Promise<ListEntry> {
    const { data } = await http.patch(`/me/links/${id}`, body)
    return entryResponseSchema.parse(data).entry
  },
}
