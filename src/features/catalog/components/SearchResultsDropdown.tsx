import { Film, Gamepad2, Search as SearchIcon } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { t } from '@/i18n/en'
import type { SearchHit } from '@/features/catalog/types'

interface SearchResultsDropdownProps {
  id: string
  hits: SearchHit[]
  query: string
  isLoading: boolean
  highlightedIndex: number
  getOptionId: (index: number) => string
  onHoverIndex: (index: number) => void
  onSelectHit: (hit: SearchHit) => void
  onSelectSeeAll: () => void
}

function SkeletonRows() {
  return (
    <>
      {Array.from({ length: 3 }).map((_, i) => (
        <li key={i} className="flex items-center gap-3 px-3 py-2">
          <Skeleton className="size-9 shrink-0 rounded-md" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3.5 w-2/3" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        </li>
      ))}
    </>
  )
}

function HitThumbnail({ hit }: { hit: SearchHit }) {
  if (hit.imageUrl) {
    return (
      <img
        src={hit.imageUrl}
        alt=""
        loading="lazy"
        className="size-9 shrink-0 rounded-md object-cover"
      />
    )
  }
  return (
    <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
      <SearchIcon className="size-4" aria-hidden />
    </div>
  )
}

/**
 * Lista de resultados del `SearchBar` (doc 06 tarea 2.6): puramente
 * presentacional, el estado (highlight, apertura, teclado) vive en `SearchBar`.
 * El "see all" cierra siempre la lista de opciones, incluso en 0 resultados o
 * durante loading, para que el índice de opciones no cambie de tamaño.
 */
export function SearchResultsDropdown({
  id,
  hits,
  query,
  isLoading,
  highlightedIndex,
  getOptionId,
  onHoverIndex,
  onSelectHit,
  onSelectSeeAll,
}: SearchResultsDropdownProps) {
  return (
    <ul
      id={id}
      role="listbox"
      aria-label={t.search.inputLabel}
      className="absolute top-full z-50 mt-1 max-h-96 w-full overflow-y-auto rounded-md border border-border bg-popover py-1 shadow-md"
    >
      {isLoading ? (
        <SkeletonRows />
      ) : (
        <>
          {hits.length === 0 && (
            <li className="px-3 py-2 text-sm text-muted-foreground">
              {t.search.noMatches}
            </li>
          )}
          {hits.map((hit, index) => (
            <li
              key={`${hit.kind}-${hit.id}`}
              role="option"
              id={getOptionId(index)}
              aria-selected={highlightedIndex === index}
            >
              <button
                type="button"
                tabIndex={-1}
                onMouseDown={(e) => e.preventDefault()}
                onMouseEnter={() => onHoverIndex(index)}
                onClick={() => onSelectHit(hit)}
                className={cn(
                  'flex w-full items-center gap-3 px-3 py-2 text-left text-sm',
                  highlightedIndex === index && 'bg-accent',
                )}
              >
                <HitThumbnail hit={hit} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium text-foreground">
                    {hit.name}
                  </span>
                  {hit.name !== hit.mainName && (
                    <span className="block truncate text-xs text-muted-foreground">
                      {t.search.aliasFor(hit.mainName)}
                    </span>
                  )}
                </span>
                {hit.contentType === 'V' && (
                  <Film
                    className="size-4 shrink-0 text-muted-foreground"
                    aria-label={t.card.videos}
                  />
                )}
                {hit.contentType === 'G' && (
                  <Gamepad2
                    className="size-4 shrink-0 text-muted-foreground"
                    aria-label={t.card.games}
                  />
                )}
              </button>
            </li>
          ))}
        </>
      )}

      <li
        role="option"
        id={getOptionId(hits.length)}
        aria-selected={highlightedIndex === hits.length}
      >
        <button
          type="button"
          tabIndex={-1}
          onMouseDown={(e) => e.preventDefault()}
          onMouseEnter={() => onHoverIndex(hits.length)}
          onClick={onSelectSeeAll}
          className={cn(
            'flex w-full items-center gap-2 border-t border-border px-3 py-2 text-left text-sm font-medium text-primary',
            highlightedIndex === hits.length && 'bg-accent',
          )}
        >
          <SearchIcon className="size-4" aria-hidden />
          {t.search.seeAllResults(query)}
        </button>
      </li>
    </ul>
  )
}
