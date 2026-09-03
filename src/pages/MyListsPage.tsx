import { generatePath, useNavigate, useParams } from 'react-router-dom'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { EmptyState } from '@/components/common/EmptyState'
import { ErrorState } from '@/components/common/ErrorState'
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton'
import { ChecklistTree } from '@/features/lists/components/ChecklistTree'
import { useChecklistEntries } from '@/features/lists/hooks/useChecklistEntries'
import { paths } from '@/router/paths'
import { parseIdParam } from '@/utils/slug'
import { t } from '@/i18n/en'

/**
 * Panel derecho: entries de la carpeta seleccionada. Deliberadamente mínimo
 * (solo nombres, sin imagen/progreso/agrupación por franquicia) — el
 * renderizado rico (`ListEntryRow`/`FranchiseEntryGroup`/`ProgressBar`) es la
 * tarea 3.6; acá solo se prueba que la selección llega intacta al hook.
 */
function EntriesPanel({ checklistId }: { checklistId: number | null }) {
  const entries = useChecklistEntries(checklistId)

  if (checklistId == null) {
    return (
      <EmptyState title={t.lists.selectPromptTitle} description={t.lists.selectPromptBody} />
    )
  }

  if (entries.isPending) {
    return <LoadingSkeleton variant="list-rows" count={4} />
  }

  if (entries.isError) {
    return <ErrorState onRetry={() => entries.refetch()} />
  }

  if (entries.data.length === 0) {
    return (
      <EmptyState title={t.lists.entriesEmptyTitle} description={t.lists.entriesEmptyBody} />
    )
  }

  return (
    <ul className="space-y-2">
      {entries.data.map((entry) => (
        <li key={entry.linkId} className="rounded-md border border-border px-3 py-2 text-sm">
          {entry.displayName}
        </li>
      ))}
    </ul>
  )
}

/**
 * Mis listas (doc 06/12 §3.5a): dos paneles en desktop, apilados en mobile.
 * El nodo seleccionado del árbol vive en la URL (`paths.myList`), no en
 * estado local — así el refresh y el back/forward del navegador lo conservan
 * gratis, mismo criterio que `useCatalogFilters` en el catálogo.
 */
export default function MyListsPage() {
  const { checklistId: checklistIdParam } = useParams()
  const navigate = useNavigate()
  const selectedId = parseIdParam(checklistIdParam)

  function handleSelect(id: number) {
    navigate(generatePath(paths.myList, { checklistId: String(id) }))
  }

  return (
    <PageWrapper>
      <h1 className="mb-6 text-2xl font-bold">{t.lists.title}</h1>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-[280px_1fr]">
        <ChecklistTree selectedId={selectedId} onSelect={handleSelect} />
        <EntriesPanel checklistId={selectedId} />
      </div>
    </PageWrapper>
  )
}
