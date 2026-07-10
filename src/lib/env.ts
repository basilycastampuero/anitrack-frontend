/**
 * Configuración de entorno centralizada.
 * `VITE_API_MODE` conmuta entre MSW (mock) y el backend real de Odoo sin tocar
 * componentes ni servicios (ADR-001/ADR-005).
 */
export const env = {
  apiMode: (import.meta.env.VITE_API_MODE ?? 'mock') as 'mock' | 'real',
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL ?? '/api/v1',
  isDev: import.meta.env.DEV,
} as const

export const isMockMode = env.apiMode === 'mock'
