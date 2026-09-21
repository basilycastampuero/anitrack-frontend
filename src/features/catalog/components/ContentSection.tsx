import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Film, Gamepad2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { ExpandableText } from '@/components/common/ExpandableText'
import { VersionsTable } from '@/features/catalog/components/VersionsTable'
import { contentPath } from '@/utils/slug'
import { VIDEO_TYPE_LABELS } from '@/types/media.types'
import type { ContentDetail, VersionDetail } from '@/features/catalog/types'

interface ContentSectionProps {
  content: ContentDetail
  franchiseId: number
  franchiseName: string
  /** false en la página de detalle del propio content, para no autoenlazarse. */
  linkToDetail?: boolean
  /** Se pasa tal cual a `VersionsTable`: la arma la página, no este componente. */
  renderVersionAction?: (version: VersionDetail) => ReactNode
}

/**
 * Bloque de un content dentro del detalle de franquicia (doc 06): imagen,
 * videoType badge, descripción corta y tabla de versiones. Se reutiliza tal
 * cual en `ContentDetailPage` (2.5) para el deep-link a un content puntual.
 */
export function ContentSection({
  content,
  franchiseId,
  franchiseName,
  linkToDetail = true,
  renderVersionAction,
}: ContentSectionProps) {
  const videoTypeLabel = content.videoType
    ? VIDEO_TYPE_LABELS[content.videoType]
    : null
  const TypeIcon = content.type === 'G' ? Gamepad2 : Film

  return (
    <section className="space-y-4 rounded-lg border border-border bg-card p-4">
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="w-full shrink-0 overflow-hidden rounded-md bg-muted sm:w-28">
          <div className="aspect-[2/3] w-full">
            {content.imageUrl ? (
              <img
                src={content.imageUrl}
                alt={content.name}
                loading="lazy"
                className="size-full object-cover"
              />
            ) : (
              <div className="flex size-full items-center justify-center text-muted-foreground">
                <TypeIcon className="size-8" aria-hidden />
              </div>
            )}
          </div>
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            {linkToDetail ? (
              <Link
                to={contentPath(
                  franchiseId,
                  franchiseName,
                  content.id,
                  content.name,
                )}
                className="text-lg font-semibold text-foreground hover:text-primary hover:underline"
              >
                {content.name}
              </Link>
            ) : (
              <h2 className="text-lg font-semibold text-foreground">
                {content.name}
              </h2>
            )}
            {videoTypeLabel && (
              <Badge variant="secondary">{videoTypeLabel}</Badge>
            )}
          </div>
          <ExpandableText text={content.description} />
        </div>
      </div>
      <VersionsTable
        versions={content.versions}
        renderAction={renderVersionAction}
      />
    </section>
  )
}
