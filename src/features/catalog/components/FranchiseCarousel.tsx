import { FranchiseCard } from '@/features/catalog/components/FranchiseCard'
import type { FranchiseSummary } from '@/features/catalog/types'

interface FranchiseCarouselProps {
  title: string
  items: FranchiseSummary[]
  libraryVersionSet?: Set<number>
  libraryFranchiseSet?: Set<number>
}

/**
 * Fila horizontal con scroll-snap (doc 06). Reusa FranchiseCard; el ancho fijo
 * por card viene del contenedor para que el snap se sienta natural.
 */
export function FranchiseCarousel({
  title,
  items,
  libraryFranchiseSet,
}: FranchiseCarouselProps) {
  if (items.length === 0) return null

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 [scrollbar-width:thin]">
        {items.map((franchise) => (
          <div
            key={franchise.id}
            className="w-32 shrink-0 snap-start sm:w-40"
          >
            <FranchiseCard
              franchise={franchise}
              inLibrary={libraryFranchiseSet?.has(franchise.id)}
            />
          </div>
        ))}
      </div>
    </section>
  )
}
