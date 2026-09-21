import type { ListEntry } from '@/features/lists/types'

type AggregatedProgress = NonNullable<ListEntry['aggregatedProgress']>

/**
 * Mueve `watched` del grupo que está en la posición `groupIndex`, dejando el
 * resto intacto (ADR-021). No recalcula nada: `total` sale del catálogo y el
 * orden de `lv_record_order`, y ninguno de los dos cambia al mover episodios.
 *
 * El grupo se identifica por POSICIÓN y no por su abreviación: la agregación
 * emite un grupo por hijo, y dos versiones del mismo content vinculadas en la
 * misma carpeta —la original y la doblada, por ejemplo— comparten
 * `content_abbreviation`. Matchear por etiqueta movía las dos, o sea el doble
 * del delta, que es justo el parpadeo que ADR-021 existe para evitar.
 */
function shiftGroupAt(
  aggregated: AggregatedProgress,
  groupIndex: number,
  delta: number,
): AggregatedProgress {
  return {
    groups: aggregated.groups.map((group, index) =>
      index === groupIndex
        ? { ...group, watched: group.watched + delta }
        : group,
    ),
  }
}

/**
 * Escribe `watchedEpisodes` en el entry `linkId` —suelto o hijo de un
 * franchise-link— y, si es hijo, aplica el **delta** al grupo del padre que
 * le corresponde por posición.
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

    // La agregación saltea los hijos que no son version-links, así que la
    // posición del grupo es cuántos version-links vienen ANTES de este, no el
    // índice crudo dentro de `childEntries`.
    const groupIndex = children
      .slice(0, index)
      .filter((sibling) => sibling.version != null).length

    return {
      ...entry,
      childEntries: nextChildren,
      ...(entry.aggregatedProgress
        ? {
            aggregatedProgress: shiftGroupAt(
              entry.aggregatedProgress,
              groupIndex,
              delta,
            ),
          }
        : {}),
    }
  })

  return changed ? result : entries
}

/** Campos del entry que se editan sin tocar el progreso ni el agregado. */
export type EntryMetaPatch = Pick<
  ListEntry,
  'notes' | 'rating' | 'startedAt' | 'finishedAt'
>

/**
 * Hermano de `patchEntryProgress` para los campos que **no** mueven el
 * agregado del padre: notas, puntaje y fechas. Por eso no hay delta que
 * aplicar acá — el `[S1 12/25]` del franchise-link sale de `watchedEpisodes` y
 * `version_episodes`, y ninguno de estos campos lo toca.
 *
 * Mismo structural sharing: solo el entry editado —y su padre, si es hijo de
 * un grupo— cambian de identidad.
 */
export function patchEntryFields(
  entries: ListEntry[],
  linkId: number,
  patch: Partial<EntryMetaPatch>,
): ListEntry[] {
  let changed = false

  const result = entries.map((entry) => {
    if (entry.linkId === linkId) {
      changed = true
      return { ...entry, ...patch }
    }

    const children = entry.childEntries
    if (!children) return entry
    const index = children.findIndex((child) => child.linkId === linkId)
    if (index === -1) return entry
    const child = children[index]
    if (!child) return entry

    changed = true
    const nextChildren = [...children]
    nextChildren[index] = { ...child, ...patch }
    return { ...entry, childEntries: nextChildren }
  })

  return changed ? result : entries
}
