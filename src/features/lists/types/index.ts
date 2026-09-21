import { ApiError } from '@/types/api.types'
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
export function isVersionEntry(entry: ListEntry): entry is VersionEntry {
  return entry.kind === 'version' && entry.version != null
}

/** Un `ListEntry` ya narrowado por `isVersionEntry`: `version` está garantizado. */
export type VersionEntry = ListEntry & {
  kind: 'version'
  version: NonNullable<ListEntry['version']>
}

/** Una aparición previa de la versión, con la lista donde vive (doc 04, `409`). */
export interface ExistingLink {
  entry: ListEntry
  checklistId: number
  checklistName: string
}

/**
 * `409 ALREADY_LINKED` ya parseado (doc 15 §3.3). `ApiError.detail` es
 * `unknown` a propósito, y este es el único error del contrato cuyo payload
 * alimenta una decisión del usuario — así que se valida donde se valida todo
 * lo demás, en el service con Zod, y el componente nunca hace `as` sobre
 * `detail`.
 *
 * Si el payload no valida, el service deja pasar el `ApiError` crudo: el
 * wizard cae igual al paso de conflicto, sin la lista de apariciones, y
 * ofrece solo "agregar igual / cancelar". Degrada, no rompe.
 */
export class AlreadyLinkedError extends ApiError {
  readonly existing: ExistingLink[]

  constructor(source: ApiError, existing: ExistingLink[]) {
    super(
      source.code,
      source.message,
      source.status,
      source.detail,
      source.field,
    )
    this.name = 'AlreadyLinkedError'
    this.existing = existing
  }
}
