/**
 * Claves de TanStack Query del feature lists (doc 12 §3). Única fuente de
 * `queryKey` para `/me/checklists*` y `/me/library-index`.
 *
 * Nota: esto arranca minimal (solo lo que ya consume `useLibraryIndex` +
 * el prefijo raíz que `useLogout` necesita para vaciar el cache privado en
 * logout, tarea 3.1). La tarea 3.4 suma acá `tree()` y `entries(checklistId)`
 * cuando lleguen los hooks de mutación de checklists — no reinventar el
 * archivo, extender este mismo objeto.
 */
export const listKeys = {
  all: ['lists'] as const,
  libraryIndex: () => [...listKeys.all, 'library-index'] as const,
}
