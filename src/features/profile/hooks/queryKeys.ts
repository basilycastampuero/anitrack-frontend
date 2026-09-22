/**
 * Claves de TanStack Query del feature profile (doc 15 §3.5).
 *
 * **No se limpian en logout**, a diferencia de `listKeys`: un perfil público
 * es dato público, no privado, así que removerlo solo costaría un refetch de
 * algo que cualquiera puede ver igual sin sesión.
 */
export const profileKeys = {
  all: ['profile'] as const,
  detail: (userId: number) => [...profileKeys.all, 'detail', userId] as const,
  entries: (userId: number, checklistId: number) =>
    [...profileKeys.all, 'entries', userId, checklistId] as const,
}
