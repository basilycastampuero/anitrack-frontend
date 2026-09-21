import type {
  ChecklistNode,
  LibraryIndex,
  ListEntry,
} from '@/features/lists/types'
import { isVersionEntry } from '@/features/lists/types'
import type { PublicProfile } from '@/features/profile/types'
import type {
  AltName,
  ContentDetail,
  FranchiseDetail,
  VersionDetail,
} from '@/features/catalog/types'
import { franchises } from '@/mocks/seed/franchises'
import type { SeedChecklistNode } from '@/mocks/seed/lists'

/**
 * Funciones puras que el mock usa para **derivar** lo que el backend calcula,
 * en vez de dejarlo escrito a mano en el seed (ADR-022, tarea 3.12).
 *
 * El criterio: si el backend lo computa, acá se computa. Un contador escrito
 * a mano en el seed es un mock que miente — pasa los tests en verde mientras
 * la lógica real no existe, que es el patrón que ya hizo pasar cinco tests en
 * falso durante el Sprint 3a.
 *
 * Todas reciben los datos por argumento y no importan el estado mutable del
 * seed, así que se pueden testear solas.
 */

export type EntriesByChecklist = Record<number, ListEntry[]>

// ---------------------------------------------------------------- árbol ----

/** Busca un nodo por id en todo el árbol, no solo en el nivel superior. */
export function findChecklist(
  nodes: SeedChecklistNode[],
  id: number,
): SeedChecklistNode | null {
  for (const node of nodes) {
    if (node.id === id) return node
    const found = findChecklist(node.children, id)
    if (found) return found
  }
  return null
}

/** Quita el nodo `id` de donde esté en el árbol (in-place). `true` si lo halló. */
export function removeChecklist(
  nodes: SeedChecklistNode[],
  id: number,
): boolean {
  const index = nodes.findIndex((n) => n.id === id)
  if (index !== -1) {
    nodes.splice(index, 1)
    return true
  }
  return nodes.some((n) => removeChecklist(n.children, id))
}

/** El propio id de `node` más el de todos sus descendientes. */
export function collectSubtreeIds(node: {
  id: number
  children: { id: number }[]
}): number[] {
  return [
    node.id,
    ...node.children.flatMap((c) => collectSubtreeIds(c as SeedChecklistNode)),
  ]
}

/**
 * `linkCount` = entries de **primer nivel** de esa carpeta: un franchise-link
 * cuenta como uno solo aunque agrupe varias versiones, que es lo que muestra
 * el árbol de la UI (`ChecklistTreeItem`). Los descendientes los suma aparte
 * `countDescendants` en el frontend.
 */
export function countLinks(entries: ListEntry[] | undefined): number {
  return entries?.length ?? 0
}

/** Proyecta el árbol del seed al `ChecklistNode` del contrato, con `linkCount` derivado. */
export function toChecklistTree(
  nodes: SeedChecklistNode[],
  entries: EntriesByChecklist,
): ChecklistNode[] {
  return nodes.map((node) => ({
    ...node,
    linkCount: countLinks(entries[node.id]),
    children: toChecklistTree(node.children, entries),
  }))
}

/**
 * Bosque de subárboles publicados (doc 04). `isPublished` es un campo **por
 * registro** y no se hereda: una sub-carpeta publicada bajo una privada es
 * pública por sí misma, y va como raíz del bosque. Filtrar solo el nivel
 * superior —lo que hacía el mock antes— escondía esas sub-carpetas.
 */
export function publishedForest(nodes: ChecklistNode[]): ChecklistNode[] {
  return nodes.flatMap((node) =>
    node.isPublished
      ? [{ ...node, children: publishedForest(node.children) }]
      : publishedForest(node.children),
  )
}

// --------------------------------------------------------------- entries ----

/** Aplana un entry a sus version-links: el suelto es él mismo, el grupo son sus hijos. */
export function versionEntriesOf(entries: ListEntry[]): ListEntry[] {
  return entries.flatMap((entry) =>
    entry.kind === 'franchise' ? (entry.childEntries ?? []) : [entry],
  )
}

/**
 * Agregado del franchise-link a partir de sus hijos. Misma forma que
 * `compute_show_name` en Odoo: un grupo por versión, con su abreviatura.
 */
export function aggregateProgress(
  children: ListEntry[],
): NonNullable<ListEntry['aggregatedProgress']> {
  return {
    groups: children.filter(isVersionEntry).map((child) => ({
      abbreviation: child.version.abbreviation ?? child.displayName,
      watched: child.version.watchedEpisodes,
      total: child.version.totalEpisodes,
    })),
  }
}

/** Dónde vive un entry: su carpeta y, si es hijo de un grupo, su padre. */
export interface EntryLocation {
  entry: ListEntry
  parent: ListEntry | null
  checklistId: number
  checklistName: string
}

/** Todas las apariciones de entries del usuario, incluidas las anidadas. */
export function locateEntries(
  nodes: SeedChecklistNode[],
  entries: EntriesByChecklist,
): EntryLocation[] {
  const found: EntryLocation[] = []
  const walk = (list: SeedChecklistNode[]): void => {
    for (const node of list) {
      for (const entry of entries[node.id] ?? []) {
        found.push({
          entry,
          parent: null,
          checklistId: node.id,
          checklistName: node.name,
        })
        for (const child of entry.childEntries ?? []) {
          found.push({
            entry: child,
            parent: entry,
            checklistId: node.id,
            checklistName: node.name,
          })
        }
      }
      walk(node.children)
    }
  }
  walk(nodes)
  return found
}

// ----------------------------------------------------------------- stats ----

/**
 * Stats del perfil público. Cuentan **solo** links que viven en checklists
 * publicadas (doc 04): contar todo filtraría el tamaño de las listas privadas
 * del usuario en un endpoint sin sesión.
 *
 * `totalEntries` son version-links —lo que el usuario mira—, no grupos: un
 * franchise-link es una agrupación, no un título.
 */
export function computeStats(
  published: ChecklistNode[],
  entries: EntriesByChecklist,
): PublicProfile['stats'] {
  const ids = published.flatMap(collectSubtreeIds)
  const links = ids.flatMap((id) => versionEntriesOf(entries[id] ?? []))
  return {
    totalEntries: links.length,
    totalEpisodesWatched: links.reduce(
      (sum, link) => sum + (link.version?.watchedEpisodes ?? 0),
      0,
    ),
    byContentType: {
      games: links.filter((l) => l.contentType === 'G').length,
      videos: links.filter((l) => l.contentType === 'V').length,
    },
  }
}

// --------------------------------------------------------------- catálogo ----

/** Una versión del catálogo con su content y su franquicia. */
export interface CatalogRef {
  franchise: FranchiseDetail
  content: ContentDetail
  version: VersionDetail
}

/**
 * Resuelve un `versionId` contra el seed del catálogo. Es lo que evita que el
 * mock invente nombres, imágenes y totales de episodios: el `POST /me/links`
 * del backend real los saca del catálogo, no del body.
 */
export function resolveVersion(versionId: number): CatalogRef | null {
  for (const franchise of franchises) {
    for (const content of [
      ...franchise.gameContents,
      ...franchise.videoContents,
    ]) {
      const version = content.versions.find((v) => v.id === versionId)
      if (version) return { franchise, content, version }
    }
  }
  return null
}

/** Busca un nombre alternativo por id dentro de los de un content/franquicia. */
export function findAltName(names: AltName[], id: number): AltName | null {
  return names.find((n) => n.id === id) ?? null
}

/**
 * Índice de biblioteca derivado de los entries reales. Antes era un array
 * escrito a mano en el seed que el `POST` agrandaba y el `DELETE` nunca
 * achicaba: se podía desvincular algo y seguir viéndolo como "in your list".
 */
export function deriveLibraryIndex(
  nodes: SeedChecklistNode[],
  entries: EntriesByChecklist,
): LibraryIndex {
  const all = locateEntries(nodes, entries).map((l) => l.entry)
  return {
    versionIds: [
      ...new Set(all.flatMap((e) => (e.version ? [e.version.versionId] : []))),
    ],
    franchiseIds: [...new Set(all.map((e) => e.franchiseId))],
  }
}
