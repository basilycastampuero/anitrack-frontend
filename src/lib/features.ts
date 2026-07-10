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
