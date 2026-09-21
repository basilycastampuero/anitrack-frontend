import { isMockMode } from '@/lib/env'

/**
 * Feature flags (ADR-004). Los campos que el backend Odoo aún no implementa
 * (rating, notas como campo dedicado, fechas) se muestran SOLO cuando su flag
 * está activo. Default: activos contra mocks, apagados contra backend real hasta
 * que existan, para no mostrar controles muertos en producción.
 */
export interface FeatureFlags {
  ratings: boolean
  watchDates: boolean
}

export const features: FeatureFlags = {
  ratings: isMockMode,
  watchDates: isMockMode,
}

/**
 * Único punto de consulta de los flags (doc 15 §4.6). Los componentes
 * preguntan por acá y no leen `features` directo por dos razones: el valor se
 * resuelve en cada llamada —así un test puede variarlo sin `vi.mock` del
 * módulo entero— y queda un solo lugar donde cambiar la fuente de los flags si
 * algún día dejan de salir de `isMockMode`.
 *
 * Ojo con qué va detrás de un flag: `notes` NO es uno de estos campos.
 * `link_description` existe en el modelo de Chano, es escribible y el endpoint
 * de entries ya lo emite; los `[EXT]` de ADR-004 son solo `rating`,
 * `startedAt` y `finishedAt`.
 */
export function isFeatureEnabled(name: keyof FeatureFlags): boolean {
  return features[name]
}
