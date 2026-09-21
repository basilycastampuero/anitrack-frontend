import { useRef, useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { LinkWizard } from '@/features/lists/components/LinkWizard'
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

  return (
    <>
      <Button
        ref={triggerRef}
        type="button"
        variant="outline"
        size="sm"
        className={className}
        onClick={() => setOpen(true)}
      >
        <Plus className="size-4" aria-hidden />
        {t.lists.wizard.trigger}
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
