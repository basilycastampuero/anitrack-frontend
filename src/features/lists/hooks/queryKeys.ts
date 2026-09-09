/**
 * Claves de TanStack Query del feature lists (doc 12 §3). Única fuente de
 * `queryKey` para `/me/checklists*` y `/me/library-index`.
 *
 * Regla de invalidación (doc 12 §3): una mutación invalida por el prefijo más
 * específico que sea correcto. Renombrar/publicar invalida `tree()`; borrar
 * invalida `tree()` **y** `entries(id)`; crear invalida solo `tree()`.
 */
export const listKeys = {
  all: ['lists'] as const,
  tree: () => [...listKeys.all, 'tree'] as const,
  entries: (checklistId: number) => [...listKeys.all, 'entries', checklistId] as const,
  libraryIndex: () => [...listKeys.all, 'library-index'] as const,
}
