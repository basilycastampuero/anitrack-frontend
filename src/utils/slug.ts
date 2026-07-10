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

/** Extrae el id numérico de un param tipo `42-fullmetal-alchemist`. */
export function parseIdParam(param: string | undefined): number | null {
  if (!param) return null
  const id = Number.parseInt(param, 10)
  return Number.isNaN(id) ? null : id
}
