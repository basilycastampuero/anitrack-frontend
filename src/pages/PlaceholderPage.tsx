import { PageWrapper } from '@/components/layout/PageWrapper'
import { EmptyState } from '@/components/common/EmptyState'
import { Construction } from 'lucide-react'
import { t } from '@/i18n/en'

/** Página placeholder para rutas cuyo contenido llega en sprints posteriores. */
export function PlaceholderPage({ title }: { title: string }) {
  return (
    <PageWrapper>
      <h1 className="mb-6 text-2xl font-bold">{title}</h1>
      <EmptyState
        icon={<Construction className="size-6" aria-hidden />}
        title={t.placeholder.comingSoon}
        description={t.placeholder.sprint}
      />
    </PageWrapper>
  )
}
