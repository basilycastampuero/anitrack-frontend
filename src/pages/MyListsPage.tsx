import { useEffect } from 'react'
import { generatePath, useNavigate, useParams } from 'react-router-dom'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { ChecklistEntries } from '@/features/lists/components/ChecklistEntries'
import { ChecklistTree } from '@/features/lists/components/ChecklistTree'
import { useChecklists } from '@/features/lists/hooks/useChecklists'
import { findChecklistNode } from '@/features/lists/utils/checklistTree'
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
  // Misma query que usa `ChecklistTree` por dentro: TanStack la deduplica por
  // `queryKey`, así que esto no agrega ninguna request.
  const checklists = useChecklists()

  // Borrar la carpeta que estás viendo dejaba la URL apuntando a un id que ya
  // no existe: el árbol se repintaba sin ella, pero el panel derecho seguía
  // pidiendo sus entries. Contra MSW eso se veía como una lista vacía y contra
  // el backend real como un ErrorState con un "Try again" que nunca iba a
  // funcionar. La URL es responsabilidad de la página, así que se corrige acá.
  //
  // `replace: true` para que el botón Atrás no devuelva a la URL muerta.
  useEffect(() => {
    if (selectedId == null || !checklists.isSuccess) return
    if (findChecklistNode(checklists.data, selectedId)) return
    navigate(paths.myLists, { replace: true })
  }, [selectedId, checklists.isSuccess, checklists.data, navigate])

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
