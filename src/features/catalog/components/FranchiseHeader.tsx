import { useMemo } from 'react'
import { Film } from 'lucide-react'
import { GenreBadge } from '@/components/common/GenreBadge'
import { ExpandableText } from '@/components/common/ExpandableText'
import { t } from '@/i18n/en'
import type { FranchiseDetail, Genre } from '@/features/catalog/types'

interface FranchiseHeaderProps {
  franchise: FranchiseDetail
}

/**
 * Une los géneros de todos los contents. El doc 04 no manda `genres` a nivel
 * franquicia (solo `FranchiseSummary` lo trae precomputado) — `FranchiseDetail`
 * sí trae los contents anidados, así que se deriva igual que en el listado.
 */
function unionGenres(franchise: FranchiseDetail): Genre[] {
  const map = new Map<number, Genre>()
  for (const content of [...franchise.videoContents, ...franchise.gameContents]) {
    for (const genre of content.genres) map.set(genre.id, genre)
  }
  return [...map.values()]
}

/** Header de detalle de franquicia (doc 06): poster, nombre + alternativos, géneros, descripción. */
export function FranchiseHeader({ franchise }: FranchiseHeaderProps) {
  const genres = useMemo(() => unionGenres(franchise), [franchise])
  const altNames = franchise.alternativeNames.filter((n) => n.name !== franchise.name)

  return (
    <header className="flex flex-col gap-4 sm:flex-row">
      <div className="w-40 shrink-0 self-start overflow-hidden rounded-lg border border-border bg-muted">
        <div className="aspect-[2/3] w-full">
          {franchise.imageUrl ? (
            <img
              src={franchise.imageUrl}
              alt={franchise.name}
              className="size-full object-cover"
            />
          ) : (
            <div className="flex size-full items-center justify-center text-muted-foreground">
              <Film className="size-10" aria-hidden />
            </div>
          )}
        </div>
      </div>
      <div className="min-w-0 flex-1 space-y-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{franchise.name}</h1>
          {altNames.length > 0 && (
            <p className="mt-1 text-sm text-muted-foreground">
              {t.detail.alsoKnownAs}: {altNames.map((n) => n.name).join(', ')}
            </p>
          )}
        </div>
        {genres.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {genres.map((genre) => (
              <GenreBadge key={genre.id} genre={genre} />
            ))}
          </div>
        )}
        <ExpandableText text={franchise.description} />
      </div>
    </header>
  )
}
