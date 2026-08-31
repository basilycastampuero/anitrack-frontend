import { Link, useParams } from 'react-router-dom'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { EmptyState } from '@/components/common/EmptyState'
import { ErrorState } from '@/components/common/ErrorState'
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { ContentSection } from '@/features/catalog/components/ContentSection'
import { useContentDetail } from '@/features/catalog/hooks/useContentDetail'
import { parseIdParam, franchisePath } from '@/utils/slug'
import { paths } from '@/router/paths'
import { ApiError } from '@/types/api.types'
import { t } from '@/i18n/en'

/**
 * Detalle de un content puntual (doc 06/07 tarea 2.5): ruta propia para
 * deep-links (`/franchise/:id/content/:contentId`). Reusa `ContentSection`
 * tal cual se ve embebido en el detalle de franquicia, más un breadcrumb de
 * vuelta a su franquicia.
 */
export default function ContentDetailPage() {
  const { contentId: contentIdParam } = useParams()
  const id = parseIdParam(contentIdParam)
  const content = useContentDetail(id)

  if (id == null) {
    return (
      <PageWrapper>
        <EmptyState
          title={t.states.contentNotFoundTitle}
          description={t.states.contentNotFoundBody}
        />
      </PageWrapper>
    )
  }

  if (content.isPending) {
    return (
      <PageWrapper className="space-y-6">
        <LoadingSkeleton variant="detail-header" />
        <LoadingSkeleton variant="list-rows" count={2} />
      </PageWrapper>
    )
  }

  if (content.isError) {
    if (content.error instanceof ApiError && content.error.code === 'NOT_FOUND') {
      return (
        <PageWrapper>
          <EmptyState
            title={t.states.contentNotFoundTitle}
            description={t.states.contentNotFoundBody}
          />
        </PageWrapper>
      )
    }
    return (
      <PageWrapper>
        <ErrorState onRetry={() => content.refetch()} />
      </PageWrapper>
    )
  }

  const data = content.data

  return (
    <PageWrapper className="space-y-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to={paths.catalog}>{t.nav.catalog}</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to={franchisePath(data.franchise.id, data.franchise.name)}>
                {data.franchise.name}
              </Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{data.name}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      <ContentSection
        content={data}
        franchiseId={data.franchise.id}
        franchiseName={data.franchise.name}
        linkToDetail={false}
      />
    </PageWrapper>
  )
}
