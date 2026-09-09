import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ContentTypeChips } from '@/features/catalog/components/ContentTypeChips'
import { MultiSelectFilter } from '@/features/catalog/components/MultiSelectFilter'
import { YearRangeInput } from '@/features/catalog/components/YearRangeInput'
import type { CatalogFilters, Genre, PlatformRef } from '@/features/catalog/types'
import { t } from '@/i18n/en'

interface FilterBarProps {
  filters: CatalogFilters
  setFilters: (patch: Partial<CatalogFilters>) => void
  clearFilters: () => void
  hasActiveFilters: boolean
  genres: Genre[]
  platforms: PlatformRef[]
}

const DEFAULT_SORT = 'DEFAULT'

const SORT_OPTIONS: { value: NonNullable<CatalogFilters['sort']>; label: string }[] = [
  { value: 'name', label: t.catalog.sortOptions.name },
  { value: 'releaseDate', label: t.catalog.sortOptions.releaseDateAsc },
  { value: '-releaseDate', label: t.catalog.sortOptions.releaseDateDesc },
]

/**
 * Barra de filtros del catálogo (doc 06): sticky bajo el header, todo el
 * estado vive en la URL. CatalogPage es dueño de `useCatalogFilters`; este
 * componente es puramente de presentación (component -> hook -> service).
 */
export function FilterBar({
  filters,
  setFilters,
  clearFilters,
  hasActiveFilters,
  genres,
  platforms,
}: FilterBarProps) {
  return (
    <div
      role="region"
      aria-label={t.catalog.filtersLabel}
      className="sticky top-14 z-30 -mx-4 border-b border-border bg-background/95 px-4 py-3 backdrop-blur-sm sm:mx-0 sm:rounded-lg sm:border sm:px-4"
    >
      <div className="flex flex-wrap items-center gap-3">
        <ContentTypeChips
          contentType={filters.contentType}
          videoType={filters.videoType}
          onChange={setFilters}
        />

        <MultiSelectFilter
          label={t.catalog.genres}
          allLabel={t.catalog.allGenres}
          items={genres}
          selectedIds={filters.genreIds}
          onChange={(genreIds) => setFilters({ genreIds })}
        />

        <MultiSelectFilter
          label={t.catalog.platforms}
          allLabel={t.catalog.allPlatforms}
          items={platforms}
          selectedIds={filters.platformIds}
          onChange={(platformIds) => setFilters({ platformIds })}
        />

        <YearRangeInput
          yearFrom={filters.yearFrom}
          yearTo={filters.yearTo}
          onChange={setFilters}
        />

        <Select
          value={filters.sort ?? DEFAULT_SORT}
          onValueChange={(value) =>
            setFilters({
              // Los únicos valores posibles son DEFAULT_SORT o uno de
              // SORT_OPTIONS (los únicos que renderizamos como SelectItem).
              sort: value === DEFAULT_SORT ? undefined : (value as CatalogFilters['sort']),
            })
          }
        >
          <SelectTrigger size="sm" aria-label={t.catalog.sort} className="w-[10rem]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={DEFAULT_SORT}>{t.catalog.sortOptions.default}</SelectItem>
            {SORT_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="sm:ml-auto">
            <X className="size-4" aria-hidden />
            {t.common.clearFilters}
          </Button>
        )}
      </div>
    </div>
  )
}
