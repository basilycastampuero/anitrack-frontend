import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RatingStars } from '@/components/ui/RatingStars'
import { useUpdateEntryMeta } from '@/features/lists/hooks/useUpdateEntryMeta'
import { isFeatureEnabled } from '@/lib/features'
import { t } from '@/i18n/en'
import type { EntryMetaPatch } from '@/features/lists/utils/entryTree'
import type { VersionEntry } from '@/features/lists/types'

interface EntryNotesDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  entry: VersionEntry
  checklistId: number
  onClosed?: () => void
}

/**
 * Editar los datos "blandos" de un entry (tarea 3.11).
 *
 * Las **notas no están detrás de ningún flag** (doc 15 §4.6): `notes` mapea a
 * `link_description`, que existe en el modelo de Chano, es escribible y el
 * endpoint de entries ya lo emite. Los `[EXT]` de ADR-004 —puntaje y fechas—
 * sí, y cuando su flag está apagado no se renderizan **ni viajan en el body**
 * (eso último lo garantiza el hook).
 */
export function EntryNotesDialog({
  open,
  onOpenChange,
  entry,
  checklistId,
  onClosed,
}: EntryNotesDialogProps) {
  const updateMeta = useUpdateEntryMeta(checklistId, entry.linkId)
  const [notes, setNotes] = useState(entry.notes ?? '')
  const [rating, setRating] = useState<number | null>(entry.rating ?? null)
  const [startedAt, setStartedAt] = useState(entry.startedAt ?? '')
  const [finishedAt, setFinishedAt] = useState(entry.finishedAt ?? '')

  // Repone el formulario en cada apertura: sin esto, reabrir sobre OTRO entry
  // mostraría lo que se tipeó en el anterior (mismo criterio que
  // `ChecklistFormDialog`).
  useEffect(() => {
    if (!open) return
    setNotes(entry.notes ?? '')
    setRating(entry.rating ?? null)
    setStartedAt(entry.startedAt ?? '')
    setFinishedAt(entry.finishedAt ?? '')
  }, [open, entry])

  const showRating = isFeatureEnabled('ratings')
  const showDates = isFeatureEnabled('watchDates')

  function handleSave() {
    const patch: Partial<EntryMetaPatch> = {
      notes: notes.trim() === '' ? null : notes,
    }
    if (showRating) patch.rating = rating
    if (showDates) {
      patch.startedAt = startedAt === '' ? null : startedAt
      patch.finishedAt = finishedAt === '' ? null : finishedAt
    }
    updateMeta.mutate(patch)
    onOpenChange(false)
  }

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
          <DialogTitle>{t.lists.entry.detailsTitle}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="entry-notes">{t.lists.entry.notesLabel}</Label>
            <textarea
              id="entry-notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder={t.lists.entry.notesPlaceholder}
              rows={4}
              className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
            />
          </div>

          {showRating && (
            <div className="space-y-1.5">
              <p className="text-sm font-medium text-foreground">
                {t.lists.entry.ratingLabel}
              </p>
              <RatingStars value={rating} onChange={setRating} />
            </div>
          )}

          {showDates && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="entry-started">
                  {t.lists.entry.startedAtLabel}
                </Label>
                <Input
                  id="entry-started"
                  type="date"
                  value={startedAt}
                  onChange={(event) => setStartedAt(event.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="entry-finished">
                  {t.lists.entry.finishedAtLabel}
                </Label>
                <Input
                  id="entry-finished"
                  type="date"
                  value={finishedAt}
                  onChange={(event) => setFinishedAt(event.target.value)}
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            {t.lists.entry.cancel}
          </Button>
          <Button type="button" onClick={handleSave}>
            {t.lists.entry.save}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
