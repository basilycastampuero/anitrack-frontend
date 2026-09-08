import { useState } from 'react'
import { MoreVertical } from 'lucide-react'
import { toast } from 'sonner'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ChecklistFormDialog } from '@/features/lists/components/ChecklistFormDialog'
import { DeleteChecklistDialog } from '@/features/lists/components/DeleteChecklistDialog'
import { useCreateChecklist } from '@/features/lists/hooks/useCreateChecklist'
import { useUpdateChecklist } from '@/features/lists/hooks/useUpdateChecklist'
import { useDeleteChecklist } from '@/features/lists/hooks/useDeleteChecklist'
import { apiErrorMessage } from '@/features/lists/utils/apiErrorMessage'
import type { ChecklistNode } from '@/features/lists/types'
import { t } from '@/i18n/en'

type DialogKind = 'rename' | 'create' | 'delete' | null

interface ChecklistNodeMenuProps {
  node: ChecklistNode
  /** Controlado por el caller: el atajo de teclado del árbol (Shift+F10 /
   * tecla Menú, ver `ChecklistTreeItem`) necesita poder abrir el menú sin que
   * el usuario haya clickeado el trigger (doc 12 §3.5b, riesgo #2). */
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Devuelve el foco real de DOM al `<li role="treeitem">` de origen. */
  onClosed: () => void
}

/**
 * Menú contextual por nodo del árbol (doc 12 §3.5b): renombrar, borrar,
 * publicar/despublicar y nueva sub-lista. Orquesta las tres piezas
 * presentacionales (`ChecklistFormDialog` x2 modos, `DeleteChecklistDialog`)
 * y es el único lugar que conoce los hooks de mutación — los dialogs reciben
 * `onSubmit`/`onConfirm` ya resueltos, no las mutaciones en sí.
 *
 * Publicar/despublicar no abre dialog (es un toggle de un solo campo): usa
 * `mutate` directo y, ante error, un toast — primera vez que el proyecto usa
 * `sonner` (montado en `App.tsx` desde el arranque pero nunca disparado)
 * porque acá no hay un formulario visible donde anclar un error inline como
 * en rename/create/delete.
 */
export function ChecklistNodeMenu({ node, open, onOpenChange, onClosed }: ChecklistNodeMenuProps) {
  const [dialog, setDialog] = useState<DialogKind>(null)
  const createChecklist = useCreateChecklist()
  const updateChecklist = useUpdateChecklist()
  const deleteChecklist = useDeleteChecklist()

  function handleTogglePublish() {
    updateChecklist.mutate(
      { id: node.id, patch: { isPublished: !node.isPublished } },
      { onError: (error) => toast.error(apiErrorMessage(error, t.lists.errors.publishFailed)) },
    )
  }

  return (
    <>
      <DropdownMenu open={open} onOpenChange={onOpenChange}>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            tabIndex={-1}
            aria-label={t.lists.menu.trigger(node.name)}
            onClick={(e) => e.stopPropagation()}
            className="flex size-6 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <MoreVertical className="size-4" aria-hidden />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          onCloseAutoFocus={(event) => {
            // Si el menú se cerró para abrir un dialog (rename/create/delete),
            // el foco tiene que quedarse ahí: devolverlo al `<li>` acá lo
            // arrancaría del input recién montado apenas termine la animación
            // de salida del menú (dialog y menú se cierran/abren casi a la vez).
            if (dialog !== null) return
            event.preventDefault()
            onClosed()
          }}
        >
          <DropdownMenuItem onSelect={() => setDialog('rename')}>{t.lists.menu.rename}</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setDialog('create')}>
            {t.lists.menu.newSubList}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={handleTogglePublish}>
            {node.isPublished ? t.lists.menu.unpublish : t.lists.menu.publish}
          </DropdownMenuItem>
          <DropdownMenuItem variant="destructive" onSelect={() => setDialog('delete')}>
            {t.lists.menu.delete}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* `onSubmit`/`onConfirm` solo disparan la mutación: el dialog mismo
          llama a `onOpenChange(false)` cuando el `await` resuelve. */}
      <ChecklistFormDialog
        open={dialog === 'rename'}
        onOpenChange={(next) => !next && setDialog(null)}
        onClosed={onClosed}
        mode="rename"
        initialValues={{ name: node.name }}
        onSubmit={(values) => updateChecklist.mutateAsync({ id: node.id, patch: values })}
      />

      <ChecklistFormDialog
        open={dialog === 'create'}
        onOpenChange={(next) => !next && setDialog(null)}
        onClosed={onClosed}
        mode="create"
        onSubmit={(values) => createChecklist.mutateAsync({ ...values, parentId: node.id })}
      />

      <DeleteChecklistDialog
        open={dialog === 'delete'}
        onOpenChange={(next) => !next && setDialog(null)}
        onClosed={onClosed}
        node={node}
        onConfirm={() => deleteChecklist.mutateAsync(node.id)}
      />
    </>
  )
}
