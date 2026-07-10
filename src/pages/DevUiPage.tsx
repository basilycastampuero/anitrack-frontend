import type { ReactNode } from 'react'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { GenreBadge } from '@/components/common/GenreBadge'
import { EmptyState } from '@/components/common/EmptyState'
import { ErrorState } from '@/components/common/ErrorState'
import { UserAvatar } from '@/components/common/UserAvatar'
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton'
import { FranchiseCard } from '@/features/catalog/components/FranchiseCard'
import { Button } from '@/components/ui/button'
import { genres } from '@/mocks/seed/masters'
import type { FranchiseSummary } from '@/features/catalog/types'

const sample: FranchiseSummary = {
  id: 3,
  name: 'Demon Slayer',
  imageUrl: '/mock-images/poster-5.svg',
  genres: [genres[0]!, genres[4]!, genres[3]!],
  contentCounts: { games: 0, videos: 1 },
  yearRange: { from: 2019, to: 2021 },
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h2>
      <div className="rounded-lg border border-border p-4">{children}</div>
    </section>
  )
}

/** Galería del design system (solo dev). Usar el toggle del header para ver ambos temas. */
export default function DevUiPage() {
  return (
    <PageWrapper className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Design system — batch 1</h1>
        <p className="text-sm text-muted-foreground">
          Toggle the theme from the header to preview light and dark.
        </p>
      </div>

      <Section title="Buttons">
        <div className="flex flex-wrap gap-2">
          <Button>Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="destructive">Destructive</Button>
        </div>
      </Section>

      <Section title="GenreBadge (colorIndex 1–11)">
        <div className="flex flex-wrap gap-2">
          {genres.map((genre) => (
            <GenreBadge key={genre.id} genre={genre} />
          ))}
        </div>
      </Section>

      <Section title="FranchiseCard">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <FranchiseCard franchise={sample} />
          <FranchiseCard franchise={sample} inLibrary />
          <FranchiseCard franchise={{ ...sample, imageUrl: null }} />
        </div>
      </Section>

      <Section title="UserAvatar">
        <div className="flex items-center gap-3">
          <UserAvatar name="Alex Rivera" src="/mock-images/avatar-1.svg" />
          <UserAvatar name="Sam Cortez" />
        </div>
      </Section>

      <Section title="LoadingSkeleton — card-grid">
        <LoadingSkeleton variant="card-grid" count={6} />
      </Section>

      <Section title="LoadingSkeleton — detail-header / list-rows / tree">
        <div className="space-y-6">
          <LoadingSkeleton variant="detail-header" />
          <LoadingSkeleton variant="list-rows" count={3} />
          <LoadingSkeleton variant="tree" count={4} />
        </div>
      </Section>

      <Section title="EmptyState">
        <EmptyState
          title="Nothing here yet"
          description="This is how an empty collection looks."
          action={<Button size="sm">Create list</Button>}
        />
      </Section>

      <Section title="ErrorState">
        <ErrorState onRetry={() => undefined} />
      </Section>
    </PageWrapper>
  )
}
