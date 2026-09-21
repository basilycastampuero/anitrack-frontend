import { useRef, useState } from 'react'
import { Check, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { LinkWizard } from '@/features/lists/components/LinkWizard'
import { useInLibrary } from '@/features/lists/hooks/useInLibrary'
import { t } from '@/i18n/en'
import type { AltName, VersionDetail } from '@/features/catalog/types'

interface AddToListButtonProps {
  /** Todas las versiones del content (para el paso de selección del wizard). */
  versions: VersionDetail[]
  /** Versión de esta fila: la preselecciona y saltea el paso 1. */
  versionId?: number
  contentNames: AltName[]
  franchiseNames?: AltName[]
  className?: string
}

/**
 * Dispara el `LinkWizard`. Vive en `features/lists` y no en `catalog` aunque
 * se renderice desde el detalle de franquicia (doc 15 §3.4): así `catalog`
 * sigue sin importar nada de `lists`, y quien ensambla las dos piezas es la
 * página, que es lo único con permiso para hacerlo.
 *
 * Cuando la versión ya está vinculada muestra "In your list ✓" (tarea 3.9,
 * doc 06). El botón sigue abriendo el wizard: tener algo en una lista no
 * impide agregarlo a otra, y ese segundo intento es justamente el que dispara
 * el `409` con sus tres caminos. El estado se actualiza solo, porque
 * `useCreateLink`/`useDeleteLink` invalidan `libraryIndex()`.
 */
export function AddToListButton({
  versions,
  versionId,
  contentNames,
  franchiseNames,
  className,
}: AddToListButtonProps) {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const { hasVersion } = useInLibrary()
  const linked = versionId != null && hasVersion(versionId)

  return (
    <>
      <Button
        ref={triggerRef}
        type="button"
        variant={linked ? 'secondary' : 'outline'}
        size="sm"
        className={className}
        onClick={() => setOpen(true)}
      >
        {linked ? (
          <Check className="size-4" aria-hidden />
        ) : (
          <Plus className="size-4" aria-hidden />
        )}
        {linked ? t.card.inYourList : t.lists.wizard.trigger}
      </Button>
      {open && (
        <LinkWizard
          open={open}
          onOpenChange={setOpen}
          versions={versions}
          versionId={versionId}
          contentNames={contentNames}
          franchiseNames={franchiseNames}
          onClosed={() => triggerRef.current?.focus()}
        />
      )}
    </>
  )
}
