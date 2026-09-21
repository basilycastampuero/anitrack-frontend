import type { ListEntry } from '@/features/lists/types'

type AggregatedProgress = NonNullable<ListEntry['aggregatedProgress']>

/** La etiqueta con la que un hijo aparece en el agregado del padre. */
function groupLabelOf(child: ListEntry): string {
  return child.version?.abbreviation ?? child.displayName
}

/**
 * Mueve `watched` del grupo `label` en `delta`, dejando el resto intacto
 * (ADR-021). No recalcula nada: `total` sale del catálogo y el orden de
 * `lv_record_order`, y ninguno de los dos cambia al mover episodios.
 */
function shiftGroup(
  aggregated: AggregatedProgress,
  label: string,
  delta: number,
): AggregatedProgress {
  return {
    groups: aggregated.groups.map((group) =>
      group.abbreviation === label
        ? { ...group, watched: group.watched + delta }
        : group,
    ),
  }
}

/**
 * Escribe `watchedEpisodes` en el entry `linkId` —suelto o hijo de un
 * franchise-link— y, si es hijo, aplica el **delta** al grupo del padre cuya
 * abreviación coincide.
 *
 * Por qué un delta y no recalcular la agregación (ADR-021): subir episodios
 * solo puede mover un campo de un grupo. El `total` viene del catálogo y el
 * orden de los grupos de `lv_record_order`; ninguno depende de
 * `watchedEpisodes`. Así que el delta es *demostrablemente equivalente* a lo
 * que devolverá el backend para esta mutación, y no es una segunda
 * implementación de `compute_show_name` (que es justo lo que ADR-018 decidió
 * no duplicar).
 *
 * Structural sharing igual que `patchChecklistNode`: solo el entry tocado —y
 * su padre, si lo tiene— obtiene identidad nueva, así TanStack Query no
 * re-renderiza filas que no cambiaron. Si `linkId` no está en la lista,
 * devuelve la MISMA referencia de entrada.
 */
export function patchEntryProgress(
  entries: ListEntry[],
  linkId: number,
  watchedEpisodes: number,
): ListEntry[] {
  let changed = false

  const result = entries.map((entry) => {
    if (entry.linkId === linkId && entry.version) {
      changed = true
      return { ...entry, version: { ...entry.version, watchedEpisodes } }
    }

    const children = entry.childEntries
    if (!children) return entry
    const index = children.findIndex((child) => child.linkId === linkId)
    if (index === -1) return entry
    const child = children[index]
    if (!child?.version) return entry

    changed = true
    const delta = watchedEpisodes - child.version.watchedEpisodes
    const nextChildren = [...children]
    nextChildren[index] = {
      ...child,
      version: { ...child.version, watchedEpisodes },
    }

    return {
      ...entry,
      childEntries: nextChildren,
      ...(entry.aggregatedProgress
        ? {
            aggregatedProgress: shiftGroup(
              entry.aggregatedProgress,
              groupLabelOf(child),
              delta,
            ),
          }
        : {}),
    }
  })

  return changed ? result : entries
}
