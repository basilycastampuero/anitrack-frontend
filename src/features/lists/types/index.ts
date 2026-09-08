import type { ContentType } from '@/types/media.types'

/** Carpeta de checklist del usuario (doc 04). Árbol recursivo. */
export interface ChecklistNode {
  id: number
  name: string
  description: string | null
  imageUrl: string | null
  order: number
  sortingMode: 'C' | 'N'
  isPublished: boolean
  children: ChecklistNode[]
  linkCount: number
}

/** Un entry es un franchise-link (con hijos) o un version-link suelto (doc 04). */
export interface ListEntry {
  linkId: number
  kind: 'franchise' | 'version'
  displayName: string
  imageUrl: string | null
  order: number
  contentType: ContentType
  franchiseId: number
  notes: string | null
  // kind === "version"
  version?: {
    versionId: number
    contentId: number
    abbreviation: string | null
    watchedEpisodes: number
    totalEpisodes: number // 0 => desconocido
    isSynced: boolean
  }
  // kind === "franchise"
  showProgress?: boolean
  childEntries?: ListEntry[]
  aggregatedProgress?: {
    groups: { abbreviation: string; watched: number; total: number }[]
  }
  // [EXT] pendientes de backend (ADR-004), visibles solo bajo feature flag
  rating?: number | null
  startedAt?: string | null
  finishedAt?: string | null
}

/** Body de `POST /me/checklists` (doc 04). El dueño nunca viaja acá: lo pone
 * el backend a partir de la sesión (ADR-015, mismo criterio que auth). */
export interface CreateChecklistRequest {
  name: string
  description?: string
  parentId?: number
  isPublished?: boolean
}

/** Body parcial de `PATCH /me/checklists/:id` (doc 04). */
export interface UpdateChecklistRequest {
  name?: string
  description?: string | null
  parentId?: number
  order?: number
  sortingMode?: 'C' | 'N'
  isPublished?: boolean
}

export interface CreateLinkRequest {
  checklistId: number
  versionId: number
  displayNameId: number
  groupUnderFranchise: boolean
  franchiseDisplayNameId?: number
  syncWithLinkId?: number
  force?: boolean
}

export interface UpdateLinkRequest {
  watchedEpisodes?: number
  displayName?: string
  abbreviation?: string | null
  order?: number
  notes?: string | null
  showProgress?: boolean
  rating?: number | null // [EXT]
  startedAt?: string | null // [EXT]
  finishedAt?: string | null // [EXT]
}

/** Derivado en el cliente para la UI de progreso (doc 05). */
export interface Progress {
  watched: number
  total: number | null // null cuando el backend manda 0 (en emisión)
  percent: number | null // null si total es null
}

/** Índice liviano de lo ya vinculado, para pintar "in your list" (doc 04). */
export interface LibraryIndex {
  versionIds: number[]
  franchiseIds: number[]
}

/**
 * Type guard (tarea 3.6): `ListEntry` no es una unión discriminada en TS
 * (kind y version son campos independientes), pero el contrato (doc 04)
 * garantiza que `kind === "version"` siempre trae `version`. Narrowar así
 * evita `!`/`as` en los componentes de solo lectura (`ListEntryRow`,
 * `ChecklistEntries`) al elegir entre fila suelta y grupo de franquicia.
 */
export function isVersionEntry(
  entry: ListEntry,
): entry is ListEntry & { kind: 'version'; version: NonNullable<ListEntry['version']> } {
  return entry.kind === 'version' && entry.version != null
}
