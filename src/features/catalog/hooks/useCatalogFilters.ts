import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { CatalogFilters } from '@/features/catalog/types'
import { CONTENT_TYPES, VIDEO_TYPES } from '@/types/media.types'

const SORTS: NonNullable<CatalogFilters['sort']>[] = [
  'name',
  'releaseDate',
  '-releaseDate',
]

function parseEnum<T extends string>(value: string | null, allowed: T[]): T | undefined {
  return value && (allowed as string[]).includes(value) ? (value as T) : undefined
}

function parseCsvIds(value: string | null): number[] | undefined {
  if (!value) return undefined
  const ids = value
    .split(',')
    .map(Number)
    .filter((n) => Number.isInteger(n) && n > 0)
  return ids.length ? ids : undefined
}

function parsePositiveInt(value: string | null): number | undefined {
  if (value == null) return undefined
  const n = Number(value)
  return Number.isInteger(n) && n > 0 ? n : undefined
}

function writeParam(params: URLSearchParams, key: string, value: string | undefined) {
  if (value) params.set(key, value)
  else params.delete(key)
}

/**
 * Traduce `searchParams` <-> `CatalogFilters` (doc 06: la URL es la fuente de
 * verdad del catálogo, no se duplica en Zustand). Valores inválidos en la URL
 * (editados a mano) caen a `undefined` en vez de romper.
 */
export function useCatalogFilters() {
  const [searchParams, setSearchParams] = useSearchParams()

  const filters = useMemo<CatalogFilters>(
    () => ({
      q: searchParams.get('q') ?? undefined,
      contentType: parseEnum(searchParams.get('type'), CONTENT_TYPES),
      videoType: parseEnum(searchParams.get('videoType'), VIDEO_TYPES),
      genreIds: parseCsvIds(searchParams.get('genres')),
      platformIds: parseCsvIds(searchParams.get('platforms')),
      yearFrom: parsePositiveInt(searchParams.get('yearFrom')),
      yearTo: parsePositiveInt(searchParams.get('yearTo')),
      sort: parseEnum(searchParams.get('sort'), SORTS),
      page: parsePositiveInt(searchParams.get('page')),
    }),
    [searchParams],
  )

  const setFilters = useCallback(
    (patch: Partial<CatalogFilters>) => {
      const isOnlyPageChange = Object.keys(patch).every((k) => k === 'page')
      const merged: CatalogFilters = { ...filters, ...patch }
      if (!isOnlyPageChange) merged.page = undefined // cambiar un filtro vuelve a la página 1

      const next = new URLSearchParams()
      writeParam(next, 'q', merged.q)
      writeParam(next, 'type', merged.contentType)
      writeParam(next, 'videoType', merged.videoType)
      writeParam(next, 'genres', merged.genreIds?.join(','))
      writeParam(next, 'platforms', merged.platformIds?.join(','))
      writeParam(next, 'yearFrom', merged.yearFrom?.toString())
      writeParam(next, 'yearTo', merged.yearTo?.toString())
      writeParam(next, 'sort', merged.sort)
      writeParam(next, 'page', merged.page?.toString())
      setSearchParams(next)
    },
    [filters, setSearchParams],
  )

  const clearFilters = useCallback(
    () => setSearchParams(new URLSearchParams()),
    [setSearchParams],
  )

  return { filters, setFilters, clearFilters }
}
