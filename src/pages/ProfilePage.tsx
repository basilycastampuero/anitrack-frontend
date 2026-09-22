import { useParams } from 'react-router-dom'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { EmptyState } from '@/components/common/EmptyState'
import { ErrorState } from '@/components/common/ErrorState'
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton'
import { ChecklistCard } from '@/features/profile/components/ChecklistCard'
import { ProfileHeader } from '@/features/profile/components/ProfileHeader'
import { StatsGrid } from '@/features/profile/components/StatsGrid'
import { useProfile } from '@/features/profile/hooks/useProfile'
import { useSessionStore } from '@/store/sessionStore'
import { parseIdParam } from '@/utils/slug'
import { ApiError } from '@/types/api.types'
import { t } from '@/i18n/en'
import type { ChecklistNode } from '@/features/lists/types'

/**
 * `publishedChecklists` llega como un **bosque** de subárboles publicados
 * (doc 04): una sub-carpeta publicada bajo una privada es pública por sí
 * misma y viene como raíz. Se aplana para que cada lista publicada tenga su
 * propia tarjeta y sea alcanzable, sin importar a qué profundidad estaba.
 */
function flattenPublished(nodes: ChecklistNode[]): ChecklistNode[] {
  return nodes.flatMap((node) => [node, ...flattenPublished(node.children)])
}

/**
 * Perfil público (doc 06, tarea 3.10): cabecera, stats y listas publicadas.
 * Ruta pública: se ve sin sesión.
 */
export default function ProfilePage() {
  const { userId: userIdParam } = useParams()
  const userId = parseIdParam(userIdParam)
  const profile = useProfile(userId)
  // El dueño se decide contra la sesión ya resuelta (`RootLayout` monta
  // `useMe`), no con una query aparte: un visitante anónimo no debería
  // disparar una request de auth por entrar a una página pública.
  const currentUser = useSessionStore((s) => s.user)

  if (userId == null) {
    return (
      <PageWrapper>
        <EmptyState
          title={t.profile.notFoundTitle}
          description={t.profile.notFoundBody}
        />
      </PageWrapper>
    )
  }

  if (profile.isPending) {
    return (
      <PageWrapper className="space-y-6">
        <LoadingSkeleton variant="detail-header" />
        <LoadingSkeleton variant="list-rows" count={3} />
      </PageWrapper>
    )
  }

  if (profile.isError) {
    // Un perfil inexistente no es un fallo: es una dirección que no lleva a
    // ningún lado. El resto de los errores sí ofrecen reintentar.
    if (
      profile.error instanceof ApiError &&
      profile.error.code === 'NOT_FOUND'
    ) {
      return (
        <PageWrapper>
          <EmptyState
            title={t.profile.notFoundTitle}
            description={t.profile.notFoundBody}
          />
        </PageWrapper>
      )
    }
    return (
      <PageWrapper>
        <ErrorState onRetry={() => profile.refetch()} />
      </PageWrapper>
    )
  }

  const data = profile.data
  const lists = flattenPublished(data.publishedChecklists)

  return (
    <PageWrapper className="space-y-6">
      <ProfileHeader
        profile={data}
        isOwnProfile={currentUser?.id === data.id}
      />
      <StatsGrid stats={data.stats} />

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">
          {t.profile.publishedLists}
        </h2>
        {lists.length === 0 ? (
          <EmptyState
            title={t.profile.emptyTitle}
            description={t.profile.emptyBody}
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {lists.map((checklist) => (
              <ChecklistCard
                key={checklist.id}
                checklist={checklist}
                userId={data.id}
              />
            ))}
          </div>
        )}
      </section>
    </PageWrapper>
  )
}
