import { useParams } from 'react-router-dom'
import { Film, Gamepad2 } from 'lucide-react'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { EmptyState } from '@/components/common/EmptyState'
import { ErrorState } from '@/components/common/ErrorState'
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { FranchiseHeader } from '@/features/catalog/components/FranchiseHeader'
import { ContentSection } from '@/features/catalog/components/ContentSection'
import { FranchiseGallery } from '@/features/catalog/components/FranchiseGallery'
import { useFranchiseDetail } from '@/features/catalog/hooks/useFranchiseDetail'
import { parseIdParam } from '@/utils/slug'
import { ApiError } from '@/types/api.types'
import { t } from '@/i18n/en'

/**
 * Detalle de franquicia (doc 06): header + tabs Videos/Games + ContentSection
 * (imagen, videoType, descripción, versiones) por cada content. La tab vacía
 * se oculta; si ambas tienen contenido, Videos es la default (dominio
 * video-primero, ADR-012).
 */
export default function FranchiseDetailPage() {
  const { id: idParam } = useParams()
  const id = parseIdParam(idParam)
  const franchise = useFranchiseDetail(id)

  if (id == null) {
    return (
      <PageWrapper>
        <EmptyState
          title={t.states.franchiseNotFoundTitle}
          description={t.states.franchiseNotFoundBody}
        />
      </PageWrapper>
    )
  }

  if (franchise.isPending) {
    return (
      <PageWrapper className="space-y-6">
        <LoadingSkeleton variant="detail-header" />
        <LoadingSkeleton variant="list-rows" count={3} />
      </PageWrapper>
    )
  }

  if (franchise.isError) {
    if (franchise.error instanceof ApiError && franchise.error.code === 'NOT_FOUND') {
      return (
        <PageWrapper>
          <EmptyState
            title={t.states.franchiseNotFoundTitle}
            description={t.states.franchiseNotFoundBody}
          />
        </PageWrapper>
      )
    }
    return (
      <PageWrapper>
        <ErrorState onRetry={() => franchise.refetch()} />
      </PageWrapper>
    )
  }

  const data = franchise.data
  const hasVideos = data.videoContents.length > 0
  const hasGames = data.gameContents.length > 0
  const hasBothTypes = hasVideos && hasGames
  const hasOnlyOneType = hasVideos !== hasGames

  return (
    <PageWrapper className="space-y-6">
      <FranchiseHeader franchise={data} />

      {hasBothTypes && (
        <Tabs defaultValue="video">
          <TabsList>
            <TabsTrigger value="video" className="gap-1.5">
              <Film className="size-4" aria-hidden />
              {t.card.videos}
            </TabsTrigger>
            <TabsTrigger value="game" className="gap-1.5">
              <Gamepad2 className="size-4" aria-hidden />
              {t.card.games}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="video" className="space-y-4">
            {data.videoContents.map((content) => (
              <ContentSection
                key={content.id}
                content={content}
                franchiseId={data.id}
                franchiseName={data.name}
              />
            ))}
          </TabsContent>
          <TabsContent value="game" className="space-y-4">
            {data.gameContents.map((content) => (
              <ContentSection
                key={content.id}
                content={content}
                franchiseId={data.id}
                franchiseName={data.name}
              />
            ))}
          </TabsContent>
        </Tabs>
      )}

      {hasOnlyOneType && (
        <div className="space-y-4">
          {[...data.videoContents, ...data.gameContents].map((content) => (
            <ContentSection
              key={content.id}
              content={content}
              franchiseId={data.id}
              franchiseName={data.name}
            />
          ))}
        </div>
      )}

      {!hasVideos && !hasGames && (
        <EmptyState
          title={t.states.emptyCatalogTitle}
          description={t.states.emptyCatalogBody}
        />
      )}

      <FranchiseGallery images={data.gallery} />
    </PageWrapper>
  )
}
