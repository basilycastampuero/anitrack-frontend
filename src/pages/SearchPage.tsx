import { useMemo } from 'react'
import { Search } from 'lucide-react'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/common/EmptyState'
import { ErrorState } from '@/components/common/ErrorState'
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton'
import { FilterBar } from '@/features/catalog/components/FilterBar'
import { FranchiseCard } from '@/features/catalog/components/FranchiseCard'
import { PaginationControls } from '@/features/catalog/components/PaginationControls'
import { useCatalogFilters } from '@/features/catalog/hooks/useCatalogFilters'
import { useFranchiseList } from '@/features/catalog/hooks/useFranchiseList'
import { useGenres } from '@/features/catalog/hooks/useGenres'
import { usePlatforms } from '@/features/catalog/hooks/usePlatforms'
import { useLibraryIndex } from '@/features/lists/hooks/useLibraryIndex'
import { t } from '@/i18n/en'

/**
 * Página de resultados de búsqueda (doc 06 tarea 2.6): reusa el grid, el
 * `FilterBar` y la paginación del catálogo — la única diferencia real con
 * `CatalogPage` es que `q` llega fijo por URL (desde el `SearchBar` o un Enter
 * sin selección) y, si falta, no tiene sentido pedir el catálogo completo.
 */
export default function SearchPage() {
  const { filters, setFilters, clearFilters } = useCatalogFilters()
  const query = filters.q?.trim()

  const franchises = useFranchiseList(filters, { enabled: Boolean(query) })
  const library = useLibraryIndex()
  const genres = useGenres()
  const platforms = usePlatforms()

  const libraryFranchiseSet = useMemo(
    () => new Set(library.data?.franchiseIds ?? []),
    [library.data],
  )

  if (!query) {
    return (
      <PageWrapper>
        <EmptyState
          icon={<Search className="size-6" aria-hidden />}
          title={t.search.promptTitle}
          description={t.search.promptBody}
        />
      </PageWrapper>
    )
  }

  const filterBar = (
    <FilterBar
      filters={filters}
      setFilters={setFilters}
      clearFilters={clearFilters}
      hasActiveFilters
      genres={genres.data ?? []}
      platforms={platforms.data ?? []}
    />
  )

  if (franchises.isPending) {
    return (
      <PageWrapper className="space-y-6">
        <h1 className="text-xl font-semibold">{t.search.resultsFor(query)}</h1>
        {filterBar}
        <LoadingSkeleton variant="card-grid" count={12} />
      </PageWrapper>
    )
  }

  if (franchises.isError) {
    return (
      <PageWrapper className="space-y-6">
        <h1 className="text-xl font-semibold">{t.search.resultsFor(query)}</h1>
        {filterBar}
        <ErrorState onRetry={() => franchises.refetch()} />
      </PageWrapper>
    )
  }

  const { items, page, pageSize, total } = franchises.data

  return (
    <PageWrapper className="space-y-6">
      <h1 className="text-xl font-semibold">{t.search.resultsFor(query)}</h1>
      {filterBar}

      {items.length === 0 ? (
        <EmptyState
          title={t.search.noResultsTitle}
          description={t.search.noResultsBody(query)}
          action={
            <Button variant="outline" size="sm" onClick={clearFilters}>
              {t.common.clearFilters}
            </Button>
          }
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
            {items.map((franchise) => (
              <FranchiseCard
                key={franchise.id}
                franchise={franchise}
                inLibrary={libraryFranchiseSet.has(franchise.id)}
              />
            ))}
          </div>
          <PaginationControls
            page={page}
            pageSize={pageSize}
            total={total}
            onPageChange={(next) => setFilters({ page: next })}
          />
        </>
      )}
    </PageWrapper>
  )
}
