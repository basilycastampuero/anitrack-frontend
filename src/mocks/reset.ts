import { resetListsSeed } from '@/mocks/seed/lists'
import { resetMockSession } from '@/mocks/handlers'

/**
 * Restaura TODO el estado mutable de MSW (seed de "mis listas" + sesión
 * en memoria) a su snapshot inicial. `server.resetHandlers()` (MSW) solo
 * resetea handlers agregados con `server.use(...)`, no los datos que esos
 * handlers leen/escriben — por eso hace falta este reset aparte.
 *
 * `franchises`/`masters` (catálogo) no se incluyen a propósito: ningún
 * handler los muta, son de solo lectura (ver comentario en
 * `resetListsSeed`), así que no hay estado que restaurar ahí.
 *
 * Ver deuda #7, Sprint 3a (bitácora 13).
 */
export function resetMockDb(): void {
  resetListsSeed()
  resetMockSession()
}
