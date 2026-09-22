import { useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Check, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { LinkWizard } from '@/features/lists/components/LinkWizard'
import { useInLibrary } from '@/features/lists/hooks/useInLibrary'
import { useSessionStore } from '@/store/sessionStore'
import { paths } from '@/router/paths'
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
 * Sin sesión el wizard no sirve: su árbol de carpetas depende de
 * `useChecklists`, que está deshabilitado y se queda en `isPending` para
 * siempre — un skeleton eterno. Las rutas de catálogo son públicas, así que
 * este camino es de lo más común: se ofrece entrar, y volver a esta misma
 * página después.
 */
function SignInPrompt({
  open,
  onOpenChange,
  onClosed,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onClosed: () => void
}) {
  const location = useLocation()
  const next = `${location.pathname}${location.search}`

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        onCloseAutoFocus={(event) => {
          event.preventDefault()
          onClosed()
        }}
      >
        <DialogHeader>
          <DialogTitle>{t.lists.wizard.signInTitle}</DialogTitle>
          <DialogDescription>{t.lists.wizard.signInBody}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            {t.lists.wizard.cancel}
          </Button>
          <Button asChild>
            <Link to={`${paths.login}?next=${encodeURIComponent(next)}`}>
              {t.lists.wizard.signInCta}
            </Link>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
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
  const status = useSessionStore((state) => state.status)
  const { hasVersion } = useInLibrary()
  const linked = versionId != null && hasVersion(versionId)
  const returnFocus = () => triggerRef.current?.focus()

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
      {open &&
        (status === 'authenticated' ? (
          <LinkWizard
            open={open}
            onOpenChange={setOpen}
            versions={versions}
            versionId={versionId}
            contentNames={contentNames}
            franchiseNames={franchiseNames}
            onClosed={returnFocus}
          />
        ) : (
          <SignInPrompt
            open={open}
            onOpenChange={setOpen}
            onClosed={returnFocus}
          />
        ))}
    </>
  )
}
