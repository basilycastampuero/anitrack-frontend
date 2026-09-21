import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { WizardConflictStep } from '@/features/lists/components/WizardConflictStep'
import { WizardTargetStep } from '@/features/lists/components/WizardTargetStep'
import { WizardVersionStep } from '@/features/lists/components/WizardVersionStep'
import { useLinkWizard } from '@/features/lists/hooks/useLinkWizard'
import { t } from '@/i18n/en'
import type { AltName, VersionDetail } from '@/features/catalog/types'

interface LinkWizardProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  versions: VersionDetail[]
  /** Versión ya elegida: saltea el paso 1. */
  versionId?: number
  contentNames: AltName[]
  franchiseNames?: AltName[]
  /** Devuelve el foco al botón que abrió el diálogo. */
  onClosed?: () => void
}

const STEP_TITLES = {
  version: t.lists.wizard.versionStep,
  target: t.lists.wizard.targetStep,
  conflict: t.lists.wizard.conflictStep,
} as const

/**
 * Modal de "agregar a una lista" (doc 06, tarea 3.8). Es solo el contenedor:
 * la máquina de estados vive en `useLinkWizard` y cada paso en su componente.
 *
 * El título del paso va en un `aria-live="polite"`: cambiar de paso no
 * remonta el diálogo, así que sin esto un lector de pantalla no anunciaría
 * que el contenido cambió debajo del foco.
 */
export function LinkWizard({
  open,
  onOpenChange,
  versions,
  versionId,
  contentNames,
  franchiseNames,
  onClosed,
}: LinkWizardProps) {
  const wizard = useLinkWizard({
    versions,
    initialVersionId: versionId,
    onFinished: () => onOpenChange(false),
  })

  const currentVersionId =
    wizard.state.step === 'version' ? null : wizard.state.versionId
  const currentVersion = versions.find(
    (version) => version.id === currentVersionId,
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        onCloseAutoFocus={(event) => {
          if (!onClosed) return
          event.preventDefault()
          onClosed()
        }}
      >
        <DialogHeader>
          <DialogTitle>{t.lists.wizard.title}</DialogTitle>
          <DialogDescription aria-live="polite">
            {STEP_TITLES[wizard.state.step]}
          </DialogDescription>
        </DialogHeader>

        {wizard.state.step === 'version' && (
          <WizardVersionStep
            versions={versions}
            onChoose={wizard.chooseVersion}
          />
        )}

        {wizard.state.step === 'target' && (
          <WizardTargetStep
            contentNames={contentNames}
            franchiseNames={franchiseNames}
            isSubmitting={wizard.isSubmitting}
            error={wizard.error}
            onSubmit={(values) => void wizard.submitTarget(values)}
            onBack={
              versionId == null && versions.length > 1 ? wizard.cancel : null
            }
            onCancel={wizard.cancel}
          />
        )}

        {wizard.state.step === 'conflict' && (
          <WizardConflictStep
            existing={wizard.state.existing}
            versionName={currentVersion?.name ?? ''}
            isSubmitting={wizard.isSubmitting}
            error={wizard.error}
            onAddAnyway={() => void wizard.addAnyway()}
            onSyncedCopy={(linkId) => void wizard.createSyncedCopy(linkId)}
            onCancel={wizard.cancel}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}
