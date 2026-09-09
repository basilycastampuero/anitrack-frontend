import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { apiErrorMessage } from '@/features/lists/utils/apiErrorMessage'
import { t } from '@/i18n/en'

const checklistFormSchema = z.object({
  name: z.string().trim().min(1, t.lists.errors.nameRequired),
})

type ChecklistFormValues = z.infer<typeof checklistFormSchema>

interface ChecklistFormDialogProps {
  open: boolean
  /** `false` cubre Escape, click afuera y Cancelar — todos cierran igual. */
  onOpenChange: (open: boolean) => void
  mode: 'create' | 'rename'
  initialValues?: { name: string }
  /** Ejecuta la mutación (create o rename, según `mode`) y rechaza si falla —
   * el dialog mapea el error, no el caller (doc 12 §3.5b). */
  onSubmit: (values: ChecklistFormValues) => Promise<unknown>
  /** Devuelve el foco al `<li role="treeitem">` de origen (doc 12 §3.5b:
   * accesibilidad). Se cablea a `onCloseAutoFocus` en vez de a `onOpenChange`
   * porque Radix dispara ese evento SIEMPRE que el contenido termina de
   * cerrarse — sin importar si fue Escape, click afuera, Cancelar o un
   * submit exitoso — así no hay que duplicar la llamada en cada camino. */
  onClosed?: () => void
}

/**
 * Formulario de crear/renombrar carpeta (doc 12 §3.5b), un único campo: el
 * plan solo pide nombre para estas dos operaciones (descripción no está en el
 * CA, se puede sumar después sin tocar esta forma).
 *
 * Mismo patrón que `LoginForm`/`RegisterForm` (doc 12 §5, ficha 3.2): RHF +
 * Zod para el schema del form, error de mutación mapeado a `root` para que el
 * dialog se quede abierto y el usuario pueda reintentar sin perder lo tipeado.
 * A diferencia de esos forms, acá no hay `ErrorState`/fatalError: un fallo de
 * red en un dialog de una sola acción no amerita reemplazar el dialog entero.
 */
export function ChecklistFormDialog({
  open,
  onOpenChange,
  mode,
  initialValues,
  onSubmit,
  onClosed,
}: ChecklistFormDialogProps) {
  const form = useForm<ChecklistFormValues>({
    resolver: zodResolver(checklistFormSchema),
    defaultValues: { name: initialValues?.name ?? '' },
  })

  // Repone el form cada vez que el dialog se abre: sin esto, reabrir "Rename"
  // sobre OTRO nodo mostraría el nombre (o el error) del nodo anterior, y
  // reabrir "New sub-list" tras un submit fallido arrastraría el intento previo.
  useEffect(() => {
    if (open) form.reset({ name: initialValues?.name ?? '' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  async function handleSubmit(values: ChecklistFormValues) {
    try {
      await onSubmit(values)
      onOpenChange(false)
    } catch (error) {
      form.setError('root', { message: apiErrorMessage(error, t.lists.errors.saveFailed) })
    }
  }

  const isRename = mode === 'rename'

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
          <DialogTitle>{isRename ? t.lists.form.renameTitle : t.lists.form.createTitle}</DialogTitle>
          <DialogDescription>
            {isRename ? t.lists.form.renameSubtitle : t.lists.form.createSubtitle}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4" noValidate>
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t.lists.form.nameLabel}</FormLabel>
                  <FormControl>
                    <Input autoFocus {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {form.formState.errors.root && (
              <p role="alert" className="text-sm text-destructive">
                {form.formState.errors.root.message}
              </p>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                {t.lists.form.cancel}
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting
                  ? t.lists.form.submitting
                  : isRename
                    ? t.lists.form.submitRename
                    : t.lists.form.submitCreate}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
