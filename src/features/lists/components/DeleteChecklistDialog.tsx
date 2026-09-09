import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { countDescendants } from '@/features/lists/utils/checklistTree'
import { apiErrorMessage } from '@/features/lists/utils/apiErrorMessage'
import type { ChecklistNode } from '@/features/lists/types'
import { t } from '@/i18n/en'

interface DeleteChecklistDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  node: ChecklistNode
  /** Ejecuta `useDeleteChecklist().mutateAsync(node.id)`; rechaza si falla. */
  onConfirm: () => Promise<unknown>
  /** Devuelve el foco al nodo de origen (ver el mismo prop en
   * `ChecklistFormDialog`: se cablea a `onCloseAutoFocus`, no a `onOpenChange`). */
  onClosed?: () => void
}

/**
 * Confirmación de borrado (doc 12 §3.5b): nunca un "¿seguro?" genérico —
 * cuenta sub-carpetas y entries reales del subárbol (`countDescendants`,
 * pura y testeada aparte) porque el backend cascadea de verdad
 * (`ondelete='cascade'`, doc 12 §4) y el usuario tiene que saber qué se lleva
 * puesto antes de confirmar.
 *
 * Sin optimistic (doc 12 §5: borrar no es una edición idempotente sobre un
 * nodo existente) — el dialog se queda abierto y deshabilitado mientras la
 * mutación está en vuelo, y muestra el error inline si falla, para que el
 * usuario pueda reintentar sin tener que reabrir el menú.
 */
export function DeleteChecklistDialog({
  open,
  onOpenChange,
  node,
  onConfirm,
  onClosed,
}: DeleteChecklistDialogProps) {
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { listCount, entryCount } = countDescendants(node)

  async function handleConfirm() {
    setIsPending(true)
    setError(null)
    try {
      await onConfirm()
      onOpenChange(false)
    } catch (err) {
      setError(apiErrorMessage(err, t.lists.errors.deleteFailed))
    } finally {
      setIsPending(false)
    }
  }

  function handleOpenChange(next: boolean) {
    if (!next) setError(null)
    onOpenChange(next)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        onCloseAutoFocus={(event) => {
          if (!onClosed) return
          event.preventDefault()
          onClosed()
        }}
      >
        <DialogHeader>
          <DialogTitle>{t.lists.deleteDialog.title(node.name)}</DialogTitle>
          <DialogDescription>{t.lists.deleteDialog.body(listCount, entryCount)}</DialogDescription>
        </DialogHeader>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
            {t.lists.deleteDialog.cancel}
          </Button>
          <Button type="button" variant="destructive" disabled={isPending} onClick={handleConfirm}>
            {isPending ? t.lists.deleteDialog.confirming : t.lists.deleteDialog.confirm}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
