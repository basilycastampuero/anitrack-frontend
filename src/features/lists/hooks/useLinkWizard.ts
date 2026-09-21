import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { useCreateLink } from '@/features/lists/hooks/useCreateLink'
import { useDeleteLink } from '@/features/lists/hooks/useDeleteLink'
import { apiErrorMessage } from '@/features/lists/utils/apiErrorMessage'
import { AlreadyLinkedError } from '@/features/lists/types'
import { ApiError } from '@/types/api.types'
import { t } from '@/i18n/en'
import type { CreateLinkRequest, ExistingLink } from '@/features/lists/types'
import type { VersionDetail } from '@/features/catalog/types'

/** Lo que elige el usuario en el paso de destino. */
export interface LinkTargetValues {
  checklistId: number
  displayNameId: number
  groupUnderFranchise: boolean
  franchiseDisplayNameId?: number
}

/**
 * Estado del wizard como **unión discriminada** y no cuatro booleanos sueltos:
 * así no existe el estado imposible "en conflicto y eligiendo versión a la
 * vez", y cada paso lleva consigo exactamente los datos que necesita.
 */
export type LinkWizardState =
  | { step: 'version' }
  | { step: 'target'; versionId: number }
  | { step: 'conflict'; versionId: number; existing: ExistingLink[] }

interface UseLinkWizardArgs {
  versions: VersionDetail[]
  /** Versión ya elegida (la fila desde la que se abrió): saltea el paso 1. */
  initialVersionId?: number
  /** Cierra el diálogo: éxito, cancelar o Escape terminan todos acá. */
  onFinished: () => void
}

function initialState(
  versions: VersionDetail[],
  initialVersionId: number | undefined,
): LinkWizardState {
  if (initialVersionId != null)
    return { step: 'target', versionId: initialVersionId }
  const only = versions.length === 1 ? versions[0] : undefined
  return only ? { step: 'target', versionId: only.id } : { step: 'version' }
}

/**
 * Máquina de estados del `LinkWizard` (doc 15 §7, 3.8):
 *
 * ```
 * version → target → submit ─ 201 → cierra + toast con deshacer
 *                           └ 409 → conflict ─ "agregar igual"  → force: true
 *                                            ├ "copia sincronizada" → syncWithLinkId
 *                                            └ "cancelar"      → cierra sin crear nada
 * ```
 *
 * Los tres caminos de la CA son las tres salidas de `conflict`. El cuerpo del
 * primer intento se guarda para reintentarlo con `force`/`syncWithLinkId` sin
 * pedirle al usuario que vuelva a elegir lista y nombre.
 */
export function useLinkWizard({
  versions,
  initialVersionId,
  onFinished,
}: UseLinkWizardArgs) {
  const createLink = useCreateLink()
  const deleteLink = useDeleteLink()
  const [state, setState] = useState<LinkWizardState>(() =>
    initialState(versions, initialVersionId),
  )
  const [error, setError] = useState<string | null>(null)
  const lastBody = useRef<CreateLinkRequest | null>(null)

  async function submit(body: CreateLinkRequest): Promise<void> {
    lastBody.current = body
    setError(null)
    try {
      const entry = await createLink.mutateAsync(body)
      onFinished()
      toast.success(t.lists.wizard.added(entry.displayName), {
        action: {
          label: t.lists.wizard.undo,
          onClick: () =>
            deleteLink.mutate(
              {
                linkId: entry.linkId,
                checklistId: body.checklistId,
                isSynced: entry.version?.isSynced,
              },
              { onError: () => toast.error(t.lists.wizard.undoFailed) },
            ),
        },
      })
    } catch (caught) {
      // El `AlreadyLinkedError` trae la lista de apariciones; el `ApiError`
      // crudo con el mismo código llega cuando el payload no validó, y el
      // paso de conflicto igual sirve, solo que sin "copia sincronizada".
      if (caught instanceof AlreadyLinkedError) {
        setState({
          step: 'conflict',
          versionId: body.versionId,
          existing: caught.existing,
        })
        return
      }
      if (caught instanceof ApiError && caught.code === 'ALREADY_LINKED') {
        setState({ step: 'conflict', versionId: body.versionId, existing: [] })
        return
      }
      setError(apiErrorMessage(caught, t.lists.wizard.failed))
    }
  }

  return {
    state,
    error,
    isSubmitting: createLink.isPending,

    chooseVersion: (versionId: number) =>
      setState({ step: 'target', versionId }),

    submitTarget: (values: LinkTargetValues) => {
      if (state.step !== 'target') return Promise.resolve()
      return submit({ ...values, versionId: state.versionId })
    },

    addAnyway: () => {
      const body = lastBody.current
      return body ? submit({ ...body, force: true }) : Promise.resolve()
    },

    createSyncedCopy: (syncWithLinkId: number) => {
      const body = lastBody.current
      return body ? submit({ ...body, syncWithLinkId }) : Promise.resolve()
    },

    cancel: onFinished,
  }
}
