/**
 * Slug cosmético para URLs legibles (doc 06: `/franchise/42-fullmetal-alchemist`).
 * El id manda; el slug es decorativo, así que las rutas solo parsean el id inicial.
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')
}

export function franchisePath(id: number, name: string): string {
  return `/franchise/${id}-${slugify(name)}`
}

/** Ruta al deep-link de un content (doc 06: `paths.content`), anidada bajo su franquicia. */
export function contentPath(
  franchiseId: number,
  franchiseName: string,
  contentId: number,
  contentName: string,
): string {
  return `${franchisePath(franchiseId, franchiseName)}/content/${contentId}-${slugify(contentName)}`
}

/** Extrae el id numérico de un param tipo `42-fullmetal-alchemist`. */
export function parseIdParam(param: string | undefined): number | null {
  if (!param) return null
  const id = Number.parseInt(param, 10)
  return Number.isNaN(id) ? null : id
}

/**
 * Ruta de destino de un hit de búsqueda (doc 04 `SearchHit`). A diferencia de
 * `contentPath`, acá no tenemos el nombre real de la franquicia (el contrato
 * de `/search` no lo trae, solo `franchiseId`) — el segmento de franquicia en
 * la URL queda sin slug. No rompe nada: el router solo parsea el id inicial
 * de cada segmento (`parseIdParam`), el slug es puramente cosmético.
 *
 * Tipado estructural a propósito (no importa `SearchHit`): mantiene este
 * módulo de utilidades desacoplado de los tipos de un feature concreto.
 */
export function searchHitPath(hit: {
  kind: 'franchise' | 'content'
  id: number
  mainName: string
  franchiseId: number
}): string {
  if (hit.kind === 'franchise') {
    return franchisePath(hit.franchiseId, hit.mainName)
  }
  return `/franchise/${hit.franchiseId}/content/${hit.id}-${slugify(hit.mainName)}`
}

/** Ruta al perfil público de un usuario (`paths.profile`). */
export function profilePath(userId: number): string {
  return `/profile/${userId}`
}

/** Ruta a una lista publicada de un usuario (`paths.publicList`). */
export function publicListPath(userId: number, checklistId: number): string {
  return `${profilePath(userId)}/list/${checklistId}`
}
