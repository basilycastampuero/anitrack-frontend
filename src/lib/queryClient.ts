import { QueryClient } from '@tanstack/react-query'
import { ApiError } from '@/types/api.types'

/**
 * Config global de TanStack Query (doc 07: staleTime 60s, retry 1).
 * No reintenta ante errores de cliente (4xx) porque no se resuelven repitiendo.
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000,
        retry: (failureCount, error) => {
          if (error instanceof ApiError && error.status && error.status < 500) {
            return false
          }
          return failureCount < 1
        },
        refetchOnWindowFocus: false,
      },
      mutations: {
        retry: false,
      },
    },
  })
}
