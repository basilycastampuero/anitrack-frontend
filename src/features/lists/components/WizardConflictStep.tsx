import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { DialogFooter } from '@/components/ui/dialog'
import { t } from '@/i18n/en'
import type { ExistingLink } from '@/features/lists/types'

interface WizardConflictStepProps {
  existing: ExistingLink[]
  versionName: string
  isSubmitting: boolean
  error: string | null
  onAddAnyway: () => void
  onSyncedCopy: (linkId: number) => void
  onCancel: () => void
}

/**
 * Paso de conflicto: el `409 ALREADY_LINKED`. Sus tres salidas son los tres
 * caminos de la CA del plan.
 *
 * `existing` puede venir vacío si el payload del `409` no validó contra el
 * contrato (§3.3): en ese caso se muestra el mensaje genérico y solo quedan
 * "agregar igual" y "cancelar" — sin la lista no hay con qué sincronizar.
 */
export function WizardConflictStep({
  existing,
  versionName,
  isSubmitting,
  error,
  onAddAnyway,
  onSyncedCopy,
  onCancel,
}: WizardConflictStepProps) {
  const [syncWith, setSyncWith] = useState<number | null>(
    existing[0]?.entry.linkId ?? null,
  )

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {existing.length > 0
          ? t.lists.wizard.conflictBody(versionName)
          : t.lists.wizard.conflictUnknown}
      </p>

      {existing.length > 0 && (
        <fieldset className="space-y-2">
          <legend className="mb-2 text-sm font-medium text-foreground">
            {t.lists.wizard.syncTargetLabel}
          </legend>
          {existing.map((item) => (
            <label
              key={item.entry.linkId}
              className="flex cursor-pointer items-center gap-2 rounded-md border border-border px-3 py-2 text-sm"
            >
              <input
                type="radio"
                name="sync-with"
                value={item.entry.linkId}
                checked={syncWith === item.entry.linkId}
                onChange={() => setSyncWith(item.entry.linkId)}
                className="size-4 accent-primary"
              />
              <span className="min-w-0 flex-1 truncate">
                <span className="font-medium text-foreground">
                  {item.entry.displayName}
                </span>{' '}
                <span className="text-muted-foreground">
                  {t.lists.wizard.conflictIn(item.checklistName)}
                </span>
              </span>
            </label>
          ))}
          <p className="text-xs text-muted-foreground">
            {t.lists.wizard.syncedCopyHint}
          </p>
        </fieldset>
      )}

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      <DialogFooter className="gap-2 sm:flex-row-reverse sm:justify-start">
        {syncWith != null && (
          <Button
            type="button"
            disabled={isSubmitting}
            onClick={() => onSyncedCopy(syncWith)}
          >
            {t.lists.wizard.syncedCopy}
          </Button>
        )}
        <Button
          type="button"
          variant="outline"
          disabled={isSubmitting}
          onClick={onAddAnyway}
        >
          {t.lists.wizard.addAnyway}
        </Button>
        <Button
          type="button"
          variant="ghost"
          disabled={isSubmitting}
          onClick={onCancel}
        >
          {t.lists.wizard.cancel}
        </Button>
      </DialogFooter>
    </div>
  )
}
