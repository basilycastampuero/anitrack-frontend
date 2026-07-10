import { z } from 'zod'

/** Página de resultados (doc 04: convención de paginación). */
export interface Paginated<T> {
  items: T[]
  page: number
  pageSize: number
  total: number
}

/** Construye un schema Zod de respuesta paginada para un item dado. */
export function paginatedSchema<T extends z.ZodTypeAny>(item: T) {
  return z.object({
    items: z.array(item),
    page: z.number(),
    pageSize: z.number(),
    total: z.number(),
  })
}

/** Códigos de error del contrato (doc 04). */
export const API_ERROR_CODES = [
  'UNAUTHORIZED',
  'FORBIDDEN',
  'NOT_FOUND',
  'VALIDATION',
  'ALREADY_LINKED',
  'INTERNAL',
] as const

export type ApiErrorCode = (typeof API_ERROR_CODES)[number]

/**
 * Error normalizado que expone la capa de servicios/axios al resto de la app.
 * El interceptor traduce cualquier fallo (HTTP, red, timeout) a esta forma.
 */
export class ApiError extends Error {
  readonly code: ApiErrorCode
  readonly status: number | null
  /** Payload adicional según el código (p. ej. `existing` en ALREADY_LINKED). */
  readonly detail: unknown

  constructor(
    code: ApiErrorCode,
    message: string,
    status: number | null = null,
    detail: unknown = null,
  ) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.status = status
    this.detail = detail
  }
}

/** Envelope de error que devuelve el backend/MSW (doc 04). */
export const errorEnvelopeSchema = z.object({
  error: z.object({
    code: z.enum(API_ERROR_CODES),
    message: z.string(),
    existing: z.unknown().optional(),
  }),
})
