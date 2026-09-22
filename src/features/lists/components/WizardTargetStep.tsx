import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ChecklistTree } from '@/features/lists/components/ChecklistTree'
import { t } from '@/i18n/en'
import type { LinkTargetValues } from '@/features/lists/hooks/useLinkWizard'
import type { AltName } from '@/features/catalog/types'

interface WizardTargetStepProps {
  contentNames: AltName[]
  /** Ausente cuando el origen no conoce los nombres de la franquicia (el
   * detalle de content solo trae `{ id, name }`): el backend usa el principal. */
  franchiseNames?: AltName[]
  isSubmitting: boolean
  error: string | null
  onSubmit: (values: LinkTargetValues) => void
  onBack: (() => void) | null
  onCancel: () => void
}

function NameSelect({
  id,
  label,
  names,
  value,
  onChange,
}: {
  id: string
  label: string
  names: AltName[]
  value: number | null
  onChange: (id: number) => void
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Select
        value={value == null ? '' : String(value)}
        onValueChange={(v) => onChange(Number(v))}
      >
        <SelectTrigger id={id}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {names.map((name) => (
            <SelectItem key={name.id} value={String(name.id)}>
              {name.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

/**
 * Paso 2 del wizard (doc 06): dónde va y cómo se llama.
 *
 * El árbol de carpetas es el `ChecklistTree` que ya existe, en modo `compact`
 * —sin cabecera ni menús por nodo— y no una copia: duplicarlo habría
 * duplicado también el patrón ARIA `tree` y su navegación por teclado.
 *
 * `franchiseDisplayNameId` solo se manda cuando se va a agrupar (§6.1: el
 * backend solo lo necesita si el franchise-link se crea).
 */
export function WizardTargetStep({
  contentNames,
  franchiseNames,
  isSubmitting,
  error,
  onSubmit,
  onBack,
  onCancel,
}: WizardTargetStepProps) {
  const [checklistId, setChecklistId] = useState<number | null>(null)
  const [displayNameId, setDisplayNameId] = useState<number | null>(
    contentNames[0]?.id ?? null,
  )
  const [groupUnderFranchise, setGroupUnderFranchise] = useState(true)
  const [franchiseDisplayNameId, setFranchiseDisplayNameId] = useState<
    number | null
  >(franchiseNames?.[0]?.id ?? null)
  const [touched, setTouched] = useState(false)

  function handleSubmit() {
    setTouched(true)
    if (checklistId == null || displayNameId == null) return
    onSubmit({
      checklistId,
      displayNameId,
      groupUnderFranchise,
      ...(groupUnderFranchise && franchiseDisplayNameId != null
        ? { franchiseDisplayNameId }
        : {}),
    })
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <p className="text-sm font-medium text-foreground">
          {t.lists.wizard.targetLabel}
        </p>
        <div className="max-h-56 overflow-y-auto rounded-md border border-border p-2">
          <ChecklistTree
            compact
            selectedId={checklistId}
            onSelect={(id) => setChecklistId(id)}
          />
        </div>
        {touched && checklistId == null && (
          <p role="alert" className="text-sm text-destructive">
            {t.lists.wizard.targetRequired}
          </p>
        )}
      </div>

      {contentNames.length > 0 && (
        <NameSelect
          id="wizard-display-name"
          label={t.lists.wizard.displayNameLabel}
          names={contentNames}
          value={displayNameId}
          onChange={setDisplayNameId}
        />
      )}

      <div className="space-y-1.5">
        <label className="flex items-center gap-2 text-sm font-medium text-foreground">
          <input
            type="checkbox"
            checked={groupUnderFranchise}
            onChange={(event) => setGroupUnderFranchise(event.target.checked)}
            className="size-4 accent-primary"
          />
          {t.lists.wizard.groupLabel}
        </label>
        <p className="text-xs text-muted-foreground">
          {t.lists.wizard.groupHint}
        </p>
      </div>

      {groupUnderFranchise && franchiseNames && franchiseNames.length > 0 && (
        <NameSelect
          id="wizard-franchise-name"
          label={t.lists.wizard.franchiseNameLabel}
          names={franchiseNames}
          value={franchiseDisplayNameId}
          onChange={setFranchiseDisplayNameId}
        />
      )}

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      <DialogFooter className="gap-2">
        {onBack && (
          <Button
            type="button"
            variant="ghost"
            onClick={onBack}
            disabled={isSubmitting}
          >
            {t.lists.wizard.back}
          </Button>
        )}
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          {t.lists.wizard.cancel}
        </Button>
        <Button type="button" onClick={handleSubmit} disabled={isSubmitting}>
          {isSubmitting ? t.lists.wizard.submitting : t.lists.wizard.submit}
        </Button>
      </DialogFooter>
    </div>
  )
}
