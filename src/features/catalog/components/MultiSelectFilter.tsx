import { ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { t } from '@/i18n/en'

interface SelectableItem {
  id: number
  name: string
}

interface MultiSelectFilterProps {
  /** Nombre accesible del control y prefijo visible del trigger, ej. "Genres". */
  label: string
  /** Texto del trigger cuando no hay nada seleccionado, ej. "All genres". */
  allLabel: string
  items: SelectableItem[]
  selectedIds: number[] | undefined
  onChange: (ids: number[] | undefined) => void
}

/**
 * Select múltiple genérico (doc 06: géneros y plataformas). Se apoya en
 * DropdownMenuCheckboxItem en vez de un <Select multiple> nativo porque
 * Radix Select no soporta selección múltiple; evita traer una librería nueva.
 */
export function MultiSelectFilter({
  label,
  allLabel,
  items,
  selectedIds,
  onChange,
}: MultiSelectFilterProps) {
  const selected = selectedIds ?? []

  function toggle(id: number) {
    const next = selected.includes(id)
      ? selected.filter((selectedId) => selectedId !== id)
      : [...selected, id]
    onChange(next.length ? next : undefined)
  }

  const triggerText = selected.length ? t.catalog.itemsSelected(selected.length) : allLabel

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" aria-label={label}>
          {label}: {triggerText}
          <ChevronDown className="size-3.5 opacity-50" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="max-h-64 overflow-y-auto">
        {items.length === 0 ? (
          <div className="px-2 py-1.5 text-sm text-muted-foreground">
            {t.catalog.noOptions}
          </div>
        ) : (
          items.map((item) => (
            <DropdownMenuCheckboxItem
              key={item.id}
              checked={selected.includes(item.id)}
              onSelect={(event) => {
                // Sin esto, Radix cierra el menú en cada click: rompe la
                // selección múltiple (habría que reabrirlo por cada ítem).
                event.preventDefault()
                toggle(item.id)
              }}
            >
              {item.name}
            </DropdownMenuCheckboxItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
