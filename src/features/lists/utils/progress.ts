import type { ListEntry } from '@/features/lists/types'

/** Un grupo de `aggregatedProgress.groups` (doc 04). Se deriva del tipo
 * de dominio en vez de redeclararse a mano (regla del proyecto). */
type AggregatedProgressGroup = NonNullable<ListEntry['aggregatedProgress']>['groups'][number]

/** Zero-padea a 2 dígitos mínimo, igual que el `"{:02}".format()` de Python
 * que usa `Link.compute_show_name` — no trunca valores de 3+ dígitos. */
function pad(value: number): string {
  return String(value).padStart(2, '0')
}

/**
 * Formatea los grupos de `aggregatedProgress` — ya pre-calculados por el
 * backend (ADR-018) — como el `link_show_name` de Odoo:
 * `[S1 25/25] - [S2 03/-]`. Esta función NO agrega nada, solo da forma de
 * texto a datos estructurados; la agregación (sumar episodios por
 * abreviación, decidir cuándo un grupo es "desconocido") vive en el backend.
 *
 * Reglas de formato, verificadas byte a byte contra `Link.compute_show_name`
 * (`ll_checklist/models/database/link.py`, ver ADR-018):
 * - `watched` siempre zero-padeado a 2 dígitos.
 * - `total === 0` es "desconocido" (misma convención que `totalEpisodes` en
 *   `version`, nunca "cero episodios") y se imprime como `-`, sin padding.
 * - Un grupo sin abreviación (`""`) no deja un espacio suelto: `[03/12]`,
 *   no `[ 03/12]`.
 * - Los grupos se unen con `" - "`, en el orden en que ya vienen (el
 *   backend los ordena por `lv_record_order` mínimo; el frontend no reordena).
 */
export function formatAggregatedProgress(groups: AggregatedProgressGroup[]): string {
  return groups
    .map(({ abbreviation, watched, total }) => {
      const totalLabel = total > 0 ? pad(total) : '-'
      const prefix = abbreviation ? `${abbreviation} ` : ''
      return `[${prefix}${pad(watched)}/${totalLabel}]`
    })
    .join(' - ')
}
