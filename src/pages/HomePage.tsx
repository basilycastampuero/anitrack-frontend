import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Search, LayoutGrid } from 'lucide-react'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/common/EmptyState'
import { ErrorState } from '@/components/common/ErrorState'
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton'
import { FranchiseCarousel } from '@/features/catalog/components/FranchiseCarousel'
import { useFranchiseList } from '@/features/catalog/hooks/useFranchiseList'
import { useInLibrary } from '@/features/lists/hooks/useInLibrary'
import type { FranchiseSummary } from '@/features/catalog/types'
import { paths } from '@/router/paths'
import { t } from '@/i18n/en'

function Hero() {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-primary/15 via-primary/5 to-background px-6 py-12 sm:px-10 sm:py-16">
      <div className="max-w-xl space-y-4">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          {t.home.heroTitle}
        </h1>
        <p className="text-muted-foreground">{t.home.heroSubtitle}</p>
        <div className="flex flex-wrap gap-3">
          <Button asChild>
            <Link to={paths.catalog}>
              <LayoutGrid className="size-4" aria-hidden />
              {t.home.browseCatalog}
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link to={paths.search}>
              <Search className="size-4" aria-hidden />
              {t.common.search}
            </Link>
          </Button>
        </div>
      </div>
    </section>
  )
}

/** Agrupa por género para las filas temáticas (doc 06: 2–3 filas por género). */
function byGenre(items: FranchiseSummary[]) {
  const rows: { genreId: number; name: string; items: FranchiseSummary[] }[] =
    []
  const seen = new Set<number>()
  for (const franchise of items) {
    for (const genre of franchise.genres) {
      if (seen.has(genre.id)) continue
      const matching = items.filter((f) =>
        f.genres.some((g) => g.id === genre.id),
      )
      if (matching.length >= 3) {
        rows.push({ genreId: genre.id, name: genre.name, items: matching })
        seen.add(genre.id)
      }
      if (rows.length >= 3) return rows
    }
  }
  return rows
}

export default function HomePage() {
  const franchises = useFranchiseList({})
  const library = useInLibrary()

  const recentlyAdded = useMemo(() => {
    const items = franchises.data?.items ?? []
    return [...items].sort(
      (a, b) => (b.yearRange.to ?? 0) - (a.yearRange.to ?? 0),
    )
  }, [franchises.data])

  const genreRows = useMemo(
    () => byGenre(franchises.data?.items ?? []),
    [franchises.data],
  )

  if (franchises.isPending) {
    return (
      <PageWrapper className="space-y-8">
        <Hero />
        <LoadingSkeleton variant="card-grid" count={6} />
      </PageWrapper>
    )
  }

  if (franchises.isError) {
    return (
      <PageWrapper className="space-y-8">
        <Hero />
        <ErrorState onRetry={() => franchises.refetch()} />
      </PageWrapper>
    )
  }

  if ((franchises.data?.items.length ?? 0) === 0) {
    return (
      <PageWrapper className="space-y-8">
        <Hero />
        <EmptyState
          title={t.states.emptyCatalogTitle}
          description={t.states.emptyCatalogBody}
        />
      </PageWrapper>
    )
  }

  return (
    <PageWrapper className="space-y-10">
      <Hero />
      <FranchiseCarousel
        title={t.home.recentlyAdded}
        items={recentlyAdded}
        isInLibrary={library.hasFranchise}
      />
      {genreRows.map((row) => (
        <FranchiseCarousel
          key={row.genreId}
          title={row.name}
          items={row.items}
          isInLibrary={library.hasFranchise}
        />
      ))}
    </PageWrapper>
  )
}
