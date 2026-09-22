import { z } from 'zod'
import type { ChecklistNode, ListEntry } from '@/features/lists/types'

/**
 * Schemas recursivos (doc 04). Por la recursión, la interfaz es la fuente de
 * verdad y el schema se anota con z.ZodType<...>; el resto de tipos se infieren
 * de sus schemas (patrón estándar de Zod para árboles).
 */
export const checklistNodeSchema: z.ZodType<ChecklistNode> = z.lazy(() =>
  z.object({
    id: z.number(),
    name: z.string(),
    description: z.string().nullable(),
    imageUrl: z.string().nullable(),
    order: z.number(),
    sortingMode: z.enum(['C', 'N']),
    isPublished: z.boolean(),
    children: z.array(checklistNodeSchema),
    linkCount: z.number(),
  }),
)

export const listEntrySchema: z.ZodType<ListEntry> = z.lazy(() =>
  z.object({
    linkId: z.number(),
    kind: z.enum(['franchise', 'version']),
    displayName: z.string(),
    imageUrl: z.string().nullable(),
    order: z.number(),
    contentType: z.enum(['G', 'V']),
    franchiseId: z.number(),
    notes: z.string().nullable(),
    version: z
      .object({
        versionId: z.number(),
        contentId: z.number(),
        abbreviation: z.string().nullable(),
        watchedEpisodes: z.number(),
        totalEpisodes: z.number(),
        isSynced: z.boolean(),
      })
      .optional(),
    showProgress: z.boolean().optional(),
    childEntries: z.array(listEntrySchema).optional(),
    aggregatedProgress: z
      .object({
        groups: z.array(
          z.object({
            abbreviation: z.string(),
            watched: z.number(),
            total: z.number(),
          }),
        ),
      })
      .optional(),
    rating: z.number().nullable().optional(),
    startedAt: z.string().nullable().optional(),
    finishedAt: z.string().nullable().optional(),
  }),
)

/** Payload del `409 ALREADY_LINKED` (doc 04): dónde está ya cada aparición. */
export const existingLinkSchema = z.object({
  entry: listEntrySchema,
  checklistId: z.number(),
  checklistName: z.string(),
})
