/**
 * Claves de TanStack Query del feature auth (doc 12 §3). Única fuente de
 * `queryKey` para `/auth/*`: ninguna se escribe a mano fuera de este archivo,
 * para que una invalidación/removal no dependa de tipear el array bien.
 */
export const authKeys = {
  all: ['auth'] as const,
  me: () => [...authKeys.all, 'me'] as const,
}
