import axios, { AxiosError, type AxiosInstance } from 'axios'
import { env } from '@/lib/env'
import {
  ApiError,
  errorEnvelopeSchema,
  type ApiErrorCode,
} from '@/types/api.types'
import { useSessionStore } from '@/store/sessionStore'

/** Mapea un status HTTP a un código de error del contrato (fallback INTERNAL). */
function statusToCode(status: number): ApiErrorCode {
  switch (status) {
    case 401:
      return 'UNAUTHORIZED'
    case 403:
      return 'FORBIDDEN'
    case 404:
      return 'NOT_FOUND'
    case 409:
      return 'ALREADY_LINKED'
    case 422:
      return 'VALIDATION'
    default:
      return 'INTERNAL'
  }
}

/**
 * Traduce cualquier fallo de axios (HTTP, red, timeout) al ApiError normalizado
 * que consume el resto de la app. Extrae el envelope `{ error: {...} }` del
 * contrato (doc 04) cuando está presente.
 */
export function normalizeError(error: unknown): ApiError {
  if (error instanceof ApiError) return error

  if (error instanceof AxiosError) {
    const status = error.response?.status ?? null
    const parsed = errorEnvelopeSchema.safeParse(error.response?.data)
    if (parsed.success) {
      const { code, message, existing } = parsed.data.error
      return new ApiError(code, message, status, existing ?? null)
    }
    if (status === null) {
      return new ApiError('INTERNAL', 'Network error', null)
    }
    return new ApiError(statusToCode(status), error.message, status)
  }

  return new ApiError('INTERNAL', 'Unexpected error')
}

export function createHttpClient(): AxiosInstance {
  const client = axios.create({
    baseURL: env.apiBaseUrl,
    withCredentials: true, // ADR-005: la sesión viaja por cookie
    headers: { Accept: 'application/json' },
  })

  client.interceptors.response.use(
    (response) => response,
    (error: unknown) => {
      const apiError = normalizeError(error)
      // 401 => la cookie caducó o no hay sesión: reflejarlo en el store para que
      // los guards de ruta reaccionen. No redirigimos desde aquí (lo hace
      // <RequireAuth>) para mantener el interceptor testeable y sin side-effects
      // de navegación.
      if (apiError.code === 'UNAUTHORIZED') {
        useSessionStore.getState().clearSession()
      }
      return Promise.reject(apiError)
    },
  )

  return client
}

export const http = createHttpClient()
