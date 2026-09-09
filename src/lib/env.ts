/**
 * Configuración de entorno centralizada.
 * `VITE_API_MODE` conmuta entre MSW (mock) y el backend real de Odoo sin tocar
 * componentes ni servicios (ADR-001/ADR-005).
 */
export const env = {
  /**
   * El default depende del entorno a propósito. En desarrollo, mock: es como
   * corre el 100% del trabajo diario y no exige levantar Odoo. En producción,
   * real: un build sin la variable seteada arrancaba MSW y servía una API
   * falsa donde cualquiera entra con las credenciales del seed, sin que nada
   * fallara ni lo delatara. Un default no es neutral — cuando el olvido es
   * probable, tiene que apuntar al lado seguro.
   *
   * Poner `VITE_API_MODE=mock` en un build de producción sigue siendo válido y
   * no se bloquea: es exactamente lo que hace falta para desplegar una demo
   * sin backend. La diferencia es que ahora es una decisión explícita.
   */
  apiMode: (import.meta.env.VITE_API_MODE ??
    (import.meta.env.PROD ? 'real' : 'mock')) as 'mock' | 'real',
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL ?? '/api/v1',
  isDev: import.meta.env.DEV,
} as const

export const isMockMode = env.apiMode === 'mock'
