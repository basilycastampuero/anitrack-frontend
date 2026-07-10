import { Link } from 'react-router-dom'
import { Compass } from 'lucide-react'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { EmptyState } from '@/components/common/EmptyState'
import { Button } from '@/components/ui/button'
import { paths } from '@/router/paths'
import { t } from '@/i18n/en'

export default function NotFoundPage() {
  return (
    <PageWrapper>
      <EmptyState
        icon={<Compass className="size-6" aria-hidden />}
        title={t.states.notFoundTitle}
        description={t.states.notFoundBody}
        action={
          <Button asChild size="sm">
            <Link to={paths.home}>{t.nav.home}</Link>
          </Button>
        }
      />
    </PageWrapper>
  )
}
