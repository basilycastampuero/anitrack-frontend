import type {
  FranchiseDetail,
  FranchiseSummary,
  Genre,
  SearchHit,
  CatalogFilters,
} from '@/features/catalog/types'
import { franchises } from '@/mocks/seed/franchises'

function contentsOf(f: FranchiseDetail) {
  return [...f.gameContents, ...f.videoContents]
}

function unionGenres(f: FranchiseDetail): Genre[] {
  const map = new Map<number, Genre>()
  for (const content of contentsOf(f)) {
    for (const genre of content.genres) map.set(genre.id, genre)
  }
  return [...map.values()]
}

function yearsOf(f: FranchiseDetail): number[] {
  return contentsOf(f).flatMap((content) =>
    content.versions.map((v) => new Date(v.releaseDate).getFullYear()),
  )
}

/** FranchiseDetail -> FranchiseSummary (para grid/carruseles). */
export function toSummary(f: FranchiseDetail): FranchiseSummary {
  const years = yearsOf(f)
  return {
    id: f.id,
    name: f.name,
    imageUrl: f.imageUrl,
    genres: unionGenres(f),
    contentCounts: {
      games: f.gameContents.length,
      videos: f.videoContents.length,
    },
    yearRange: {
      from: years.length ? Math.min(...years) : null,
      to: years.length ? Math.max(...years) : null,
    },
  }
}

function matchesQuery(f: FranchiseDetail, q: string): boolean {
  const needle = q.toLowerCase()
  const names = [
    f.name,
    ...f.alternativeNames.map((n) => n.name),
    ...contentsOf(f).flatMap((content) => [
      content.name,
      ...content.alternativeNames.map((n) => n.name),
    ]),
  ]
  return names.some((n) => n.toLowerCase().includes(needle))
}

/** Aplica filtros del contrato (doc 04) sobre el seed y devuelve summaries. */
export function filterFranchises(filters: CatalogFilters): FranchiseSummary[] {
  let result = [...franchises]

  if (filters.q) result = result.filter((f) => matchesQuery(f, filters.q!))

  if (filters.contentType) {
    result = result.filter((f) =>
      filters.contentType === 'G'
        ? f.gameContents.length > 0
        : f.videoContents.length > 0,
    )
  }

  if (filters.videoType) {
    result = result.filter((f) =>
      f.videoContents.some((c) => c.videoType === filters.videoType),
    )
  }

  if (filters.genreIds?.length) {
    result = result.filter((f) =>
      unionGenres(f).some((g) => filters.genreIds!.includes(g.id)),
    )
  }

  if (filters.platformIds?.length) {
    result = result.filter((f) =>
      contentsOf(f).some((c) =>
        c.versions.some(
          (v) => v.platform && filters.platformIds!.includes(v.platform.id),
        ),
      ),
    )
  }

  if (filters.yearFrom != null) {
    result = result.filter((f) => (toSummary(f).yearRange.to ?? 0) >= filters.yearFrom!)
  }
  if (filters.yearTo != null) {
    result = result.filter(
      (f) => (toSummary(f).yearRange.from ?? 9999) <= filters.yearTo!,
    )
  }

  const summaries = result.map(toSummary)

  switch (filters.sort) {
    case 'releaseDate':
      summaries.sort((a, b) => (a.yearRange.from ?? 0) - (b.yearRange.from ?? 0))
      break
    case '-releaseDate':
      summaries.sort((a, b) => (b.yearRange.to ?? 0) - (a.yearRange.to ?? 0))
      break
    default:
      summaries.sort((a, b) => a.name.localeCompare(b.name))
  }

  return summaries
}

/** Autocompletado liviano de la SearchBar (doc 04). */
export function searchHits(q: string, limit = 8): SearchHit[] {
  const needle = q.toLowerCase()
  const hits: SearchHit[] = []

  for (const f of franchises) {
    const franchiseMatch = [f.name, ...f.alternativeNames.map((n) => n.name)].find(
      (n) => n.toLowerCase().includes(needle),
    )
    if (franchiseMatch) {
      hits.push({
        kind: 'franchise',
        id: f.id,
        name: franchiseMatch,
        mainName: f.name,
        imageUrl: f.imageUrl,
        franchiseId: f.id,
        contentType: null,
      })
    }
    for (const content of [...f.gameContents, ...f.videoContents]) {
      const contentMatch = [
        content.name,
        ...content.alternativeNames.map((n) => n.name),
      ].find((n) => n.toLowerCase().includes(needle))
      if (contentMatch) {
        hits.push({
          kind: 'content',
          id: content.id,
          name: contentMatch,
          mainName: content.name,
          imageUrl: content.imageUrl,
          franchiseId: f.id,
          contentType: content.type,
        })
      }
    }
  }

  return hits.slice(0, limit)
}
