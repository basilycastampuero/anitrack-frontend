import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FilterBar } from '@/features/catalog/components/FilterBar'
import type { CatalogFilters, Genre, PlatformRef } from '@/features/catalog/types'
import { t } from '@/i18n/en'

const GENRES: Genre[] = [
  { id: 1, name: 'Action', colorIndex: 1 },
  { id: 2, name: 'Comedy', colorIndex: 2 },
]

const PLATFORMS: PlatformRef[] = [
  { id: 10, name: 'PS5', imageUrl: null },
  { id: 11, name: 'Switch', imageUrl: null },
]

function renderFilterBar(overrides: Partial<CatalogFilters> = {}, hasActiveFilters = false) {
  const setFilters = vi.fn()
  const clearFilters = vi.fn()
  const filters: CatalogFilters = { ...overrides }

  render(
    <FilterBar
      filters={filters}
      setFilters={setFilters}
      clearFilters={clearFilters}
      hasActiveFilters={hasActiveFilters}
      genres={GENRES}
      platforms={PLATFORMS}
    />,
  )

  return { setFilters, clearFilters }
}

describe('FilterBar', () => {
  it('refleja el chip de tipo activo con aria-pressed', () => {
    renderFilterBar({ contentType: 'V' })

    expect(screen.getByRole('button', { name: t.card.videos })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(screen.getByRole('button', { name: t.card.games })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
    expect(screen.getByRole('button', { name: t.catalog.allTypes })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
  })

  it('cambiar el chip de tipo llama a setFilters con el valor correcto', async () => {
    const user = userEvent.setup()
    const { setFilters } = renderFilterBar()

    await user.click(screen.getByRole('button', { name: t.card.videos }))

    expect(setFilters).toHaveBeenCalledWith({ contentType: 'V', videoType: undefined })
  })

  it('elegir "Games" limpia el videoType previamente seleccionado', async () => {
    const user = userEvent.setup()
    const { setFilters } = renderFilterBar({ contentType: 'V', videoType: 'TV' })

    await user.click(screen.getByRole('button', { name: t.card.games }))

    expect(setFilters).toHaveBeenCalledWith({ contentType: 'G', videoType: undefined })
  })

  it('el select de videoType solo aparece con contentType "V"', () => {
    renderFilterBar({ contentType: 'G' })

    expect(screen.queryByLabelText(t.catalog.videoType)).not.toBeInTheDocument()
  })

  it('seleccionar un videoType llama a setFilters con ese valor', async () => {
    const user = userEvent.setup()
    const { setFilters } = renderFilterBar({ contentType: 'V' })

    await user.click(screen.getByLabelText(t.catalog.videoType))
    await user.click(await screen.findByRole('option', { name: 'TV' }))

    expect(setFilters).toHaveBeenCalledWith({ videoType: 'TV' })
  })

  it('seleccionar géneros llama a setFilters con los ids elegidos', async () => {
    const user = userEvent.setup()
    const { setFilters } = renderFilterBar({ genreIds: [1] })

    await user.click(screen.getByRole('button', { name: new RegExp(t.catalog.genres) }))
    await user.click(await screen.findByRole('menuitemcheckbox', { name: 'Comedy' }))

    expect(setFilters).toHaveBeenCalledWith({ genreIds: [1, 2] })
  })

  it('deseleccionar el último género envía undefined en vez de un array vacío', async () => {
    const user = userEvent.setup()
    const { setFilters } = renderFilterBar({ genreIds: [1] })

    await user.click(screen.getByRole('button', { name: new RegExp(t.catalog.genres) }))
    await user.click(await screen.findByRole('menuitemcheckbox', { name: 'Action' }))

    expect(setFilters).toHaveBeenCalledWith({ genreIds: undefined })
  })

  it('seleccionar plataformas llama a setFilters con los ids elegidos', async () => {
    const user = userEvent.setup()
    const { setFilters } = renderFilterBar()

    await user.click(screen.getByRole('button', { name: new RegExp(t.catalog.platforms) }))
    await user.click(await screen.findByRole('menuitemcheckbox', { name: 'Switch' }))

    expect(setFilters).toHaveBeenCalledWith({ platformIds: [11] })
  })

  it('cambiar el año "desde" (al perder foco) llama a setFilters', async () => {
    const user = userEvent.setup()
    const { setFilters } = renderFilterBar()

    const fromInput = screen.getByLabelText(t.catalog.yearFrom)
    await user.type(fromInput, '2010')
    await user.tab()

    expect(setFilters).toHaveBeenCalledWith({ yearFrom: 2010 })
  })

  it('cambiar el sort llama a setFilters con el valor elegido', async () => {
    const user = userEvent.setup()
    const { setFilters } = renderFilterBar()

    await user.click(screen.getByLabelText(t.catalog.sort))
    await user.click(await screen.findByRole('option', { name: t.catalog.sortOptions.name }))

    expect(setFilters).toHaveBeenCalledWith({ sort: 'name' })
  })

  it('el botón de limpiar filtros no se muestra sin filtros activos', () => {
    renderFilterBar({}, false)

    expect(
      screen.queryByRole('button', { name: t.common.clearFilters }),
    ).not.toBeInTheDocument()
  })

  it('el botón de limpiar filtros llama a clearFilters', async () => {
    const user = userEvent.setup()
    const { clearFilters } = renderFilterBar({ contentType: 'G' }, true)

    await user.click(screen.getByRole('button', { name: t.common.clearFilters }))

    expect(clearFilters).toHaveBeenCalledOnce()
  })
})
