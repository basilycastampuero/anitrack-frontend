import { useId, useState } from 'react'
import { ChevronDown, Images } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { t } from '@/i18n/en'
import type { ImageRef } from '@/features/catalog/types'

interface FranchiseGalleryProps {
  images: ImageRef[]
}

/**
 * Galería de imágenes de la franquicia (doc 06, tarea 2.7): `franchise.gallery`
 * del contrato, colapsada por defecto. El colapso usa estado propio en vez del
 * primitivo `Collapsible` de Radix -- mismo criterio que `ExpandableText`: evita
 * la animación de mount/unmount de Radix Presence, difícil de testear en jsdom
 * y sin beneficio real acá.
 *
 * "Lazy" real, no solo `loading="lazy"`: las imágenes ni se montan en el DOM
 * hasta que el usuario expande, así que colapsada no hay descargas de más.
 */
export function FranchiseGallery({ images }: FranchiseGalleryProps) {
  const [expanded, setExpanded] = useState(false)
  const gridId = useId()

  if (images.length === 0) return null

  return (
    <section className="space-y-3">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setExpanded((value) => !value)}
        aria-expanded={expanded}
        aria-controls={gridId}
        className="gap-2"
      >
        <Images className="size-4" aria-hidden />
        {expanded ? t.detail.gallery.hide : t.detail.gallery.show(images.length)}
        <ChevronDown
          className={cn('size-4 transition-transform', expanded && 'rotate-180')}
          aria-hidden
        />
      </Button>

      {expanded && (
        <div
          id={gridId}
          className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4"
        >
          {images.map((image) => (
            <img
              key={image.id}
              src={image.url}
              alt={image.name}
              loading="lazy"
              className="aspect-video w-full rounded-md border border-border object-cover"
            />
          ))}
        </div>
      )}
    </section>
  )
}
