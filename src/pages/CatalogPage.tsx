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
import { useInLibrary } from '@/features/lists/hooks/useInLibrary'
import { t } from '@/i18n/en'

/** Grid de franquicias del catálogo (doc 06). Filtros vienen de la URL, con el FilterBar como control visual. */
export default function CatalogPage() {
  const { filters, setFilters, clearFilters } = useCatalogFilters()
  const franchises = useFranchiseList(filters)
  const library = useInLibrary()
  const genres = useGenres()
  const platforms = usePlatforms()

  const hasActiveFilters = Boolean(
    filters.q ||
    filters.contentType ||
    filters.videoType ||
    filters.genreIds?.length ||
    filters.platformIds?.length ||
    filters.yearFrom ||
    filters.yearTo ||
    filters.sort,
  )

  // El FilterBar se mantiene montado en los 4 estados (doc 06: es "sticky",
  // el usuario debe poder ajustar filtros incluso sin resultados o con error).
  const filterBar = (
    <FilterBar
      filters={filters}
      setFilters={setFilters}
      clearFilters={clearFilters}
      hasActiveFilters={hasActiveFilters}
      genres={genres.data ?? []}
      platforms={platforms.data ?? []}
    />
  )

  if (franchises.isPending) {
    return (
      <PageWrapper className="space-y-6">
        {filterBar}
        <LoadingSkeleton variant="card-grid" count={12} />
      </PageWrapper>
    )
  }

  if (franchises.isError) {
    return (
      <PageWrapper className="space-y-6">
        {filterBar}
        <ErrorState onRetry={() => franchises.refetch()} />
      </PageWrapper>
    )
  }

  const { items, page, pageSize, total } = franchises.data

  if (items.length === 0) {
    return (
      <PageWrapper className="space-y-6">
        {filterBar}
        <EmptyState
          title={
            hasActiveFilters
              ? t.states.noResultsTitle
              : t.states.emptyCatalogTitle
          }
          description={
            hasActiveFilters
              ? t.states.noResultsBody
              : t.states.emptyCatalogBody
          }
          action={
            hasActiveFilters && (
              <Button variant="outline" size="sm" onClick={clearFilters}>
                {t.common.clearFilters}
              </Button>
            )
          }
        />
      </PageWrapper>
    )
  }

  return (
    <PageWrapper className="space-y-6">
      {filterBar}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
        {items.map((franchise) => (
          <FranchiseCard
            key={franchise.id}
            franchise={franchise}
            inLibrary={library.hasFranchise(franchise.id)}
          />
        ))}
      </div>
      <PaginationControls
        page={page}
        pageSize={pageSize}
        total={total}
        onPageChange={(next) => setFilters({ page: next })}
      />
    </PageWrapper>
  )
}
