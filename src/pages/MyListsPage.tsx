import { generatePath, useNavigate, useParams } from 'react-router-dom'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { ChecklistEntries } from '@/features/lists/components/ChecklistEntries'
import { ChecklistTree } from '@/features/lists/components/ChecklistTree'
import { paths } from '@/router/paths'
import { parseIdParam } from '@/utils/slug'
import { t } from '@/i18n/en'

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
        <ChecklistEntries checklistId={selectedId} />
      </div>
    </PageWrapper>
  )
}
