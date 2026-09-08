import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/common/EmptyState'
import { useCreateStarterLists } from '@/features/lists/hooks/useCreateStarterLists'
import { apiErrorMessage } from '@/features/lists/utils/apiErrorMessage'
import { t } from '@/i18n/en'

/**
 * CTA de onboarding (doc 12 §3.5c, ADR-003): reemplaza el `EmptyState`
 * genérico del árbol cuando el usuario todavía no tiene ninguna checklist.
 * `ChecklistTree` es quien decide CUÁNDO montarlo (`tree.length === 0`) —
 * este componente no sabe nada de esa condición, así que "el CTA no vuelve a
 * aparecer" (CA) es consecuencia directa de que el árbol deja de estar
 * vacío tras crear las cinco listas, no lógica propia que haya que escribir
 * acá.
 *
 * No repite el botón "Create custom list" que pide doc 06: ese camino ya
 * existe como el ícono "+" del header de `ChecklistTree` (siempre visible,
 * también con el árbol vacío) — duplicarlo acá sería el mismo botón dos
 * veces en la misma pantalla.
 */
export function StarterListsPrompt() {
  const createStarterLists = useCreateStarterLists()

  return (
    <EmptyState
      title={t.lists.starterListsPrompt.title}
      description={t.lists.starterListsPrompt.body}
      action={
        <div className="flex flex-col items-center gap-2">
          <Button
            size="sm"
            onClick={() => createStarterLists.mutate()}
            disabled={createStarterLists.isPending}
          >
            {createStarterLists.isPending
              ? t.lists.starterListsPrompt.creating
              : t.lists.starterListsPrompt.cta}
          </Button>
          {createStarterLists.isError && (
            <p role="alert" className="text-sm text-destructive">
              {apiErrorMessage(
                createStarterLists.error,
                t.lists.starterListsPrompt.errorFallback,
              )}
            </p>
          )}
        </div>
      }
    />
  )
}
