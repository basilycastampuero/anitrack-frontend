import { describe, it, expect, beforeEach } from 'vitest'
import { AxiosError, AxiosHeaders } from 'axios'
import { createHttpClient, normalizeError } from '@/lib/http'
import { ApiError } from '@/types/api.types'
import { useSessionStore } from '@/store/sessionStore'

function axiosErrorWith(status: number, data: unknown): AxiosError {
  const err = new AxiosError('Request failed')
  err.response = {
    status,
    statusText: '',
    data,
    headers: {},
    config: { headers: new AxiosHeaders() },
  }
  return err
}

describe('normalizeError', () => {
  it('extrae el envelope de error del contrato', () => {
    const result = normalizeError(
      axiosErrorWith(404, { error: { code: 'NOT_FOUND', message: 'nope' } }),
    )
    expect(result).toBeInstanceOf(ApiError)
    expect(result.code).toBe('NOT_FOUND')
    expect(result.message).toBe('nope')
    expect(result.status).toBe(404)
  })

  it('conserva el detalle en ALREADY_LINKED', () => {
    const existing = [{ linkId: 1 }]
    const result = normalizeError(
      axiosErrorWith(409, {
        error: { code: 'ALREADY_LINKED', message: 'dup', existing },
      }),
    )
    expect(result.code).toBe('ALREADY_LINKED')
    expect(result.detail).toEqual(existing)
  })

  it('mapea el status cuando no hay envelope', () => {
    const result = normalizeError(axiosErrorWith(403, '<html>error</html>'))
    expect(result.code).toBe('FORBIDDEN')
  })

  it('trata un fallo sin response como error de red', () => {
    const result = normalizeError(new AxiosError('Network Error'))
    expect(result.code).toBe('INTERNAL')
    expect(result.status).toBeNull()
  })

  it('devuelve tal cual un ApiError ya normalizado', () => {
    const original = new ApiError('VALIDATION', 'x', 422)
    expect(normalizeError(original)).toBe(original)
  })
})

describe('interceptor 401', () => {
  beforeEach(() => {
    useSessionStore.setState({ user: null, status: 'idle' })
  })

  it('limpia la sesión ante un 401 y rechaza con ApiError', async () => {
    const client = createHttpClient()
    client.defaults.adapter = async () => {
      throw axiosErrorWith(401, {
        error: { code: 'UNAUTHORIZED', message: 'no session' },
      })
    }

    await expect(client.get('/whatever')).rejects.toMatchObject({
      code: 'UNAUTHORIZED',
    })
    expect(useSessionStore.getState().status).toBe('unauthenticated')
  })
})
