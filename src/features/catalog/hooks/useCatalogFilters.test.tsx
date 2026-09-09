import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useCatalogFilters } from '@/features/catalog/hooks/useCatalogFilters'

function wrapper(initialEntries: string[]) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <MemoryRouter initialEntries={initialEntries}>{children}</MemoryRouter>
    )
  }
}

describe('useCatalogFilters', () => {
  it('parsea filtros desde la URL', () => {
    const { result } = renderHook(() => useCatalogFilters(), {
      wrapper: wrapper(['/catalog?type=V&genres=1,2&yearFrom=2010&page=3']),
    })

    expect(result.current.filters).toEqual({
      q: undefined,
      contentType: 'V',
      videoType: undefined,
      genreIds: [1, 2],
      platformIds: undefined,
      yearFrom: 2010,
      yearTo: undefined,
      sort: undefined,
      page: 3,
    })
  })

  it('ignora valores inválidos en la URL en vez de romper', () => {
    const { result } = renderHook(() => useCatalogFilters(), {
      wrapper: wrapper(['/catalog?type=BOGUS&genres=abc,2&page=notanumber']),
    })

    expect(result.current.filters.contentType).toBeUndefined()
    expect(result.current.filters.genreIds).toEqual([2])
    expect(result.current.filters.page).toBeUndefined()
  })

  it('resetea la página a 1 (undefined) al cambiar un filtro', () => {
    const { result } = renderHook(() => useCatalogFilters(), {
      wrapper: wrapper(['/catalog?page=5']),
    })

    act(() => result.current.setFilters({ contentType: 'G' }))

    expect(result.current.filters.page).toBeUndefined()
    expect(result.current.filters.contentType).toBe('G')
  })

  it('no resetea la página cuando el único cambio es la página', () => {
    const { result } = renderHook(() => useCatalogFilters(), {
      wrapper: wrapper(['/catalog?type=G']),
    })

    act(() => result.current.setFilters({ page: 2 }))

    expect(result.current.filters.page).toBe(2)
    expect(result.current.filters.contentType).toBe('G')
  })

  it('clearFilters vacía todos los filtros', () => {
    const { result } = renderHook(() => useCatalogFilters(), {
      wrapper: wrapper(['/catalog?type=G&page=3&genres=1,2']),
    })

    act(() => result.current.clearFilters())

    expect(result.current.filters).toEqual({
      q: undefined,
      contentType: undefined,
      videoType: undefined,
      genreIds: undefined,
      platformIds: undefined,
      yearFrom: undefined,
      yearTo: undefined,
      sort: undefined,
      page: undefined,
    })
  })
})
