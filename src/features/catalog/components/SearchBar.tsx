import { Search as SearchIcon, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { SearchResultsDropdown } from '@/features/catalog/components/SearchResultsDropdown'
import { useSearchBar } from '@/features/catalog/hooks/useSearchBar'
import { cn } from '@/lib/utils'
import { t } from '@/i18n/en'

interface SearchBarProps {
  className?: string
}

/**
 * Buscador global del header (doc 06/07, tarea 2.6): debounce 300ms + dropdown
 * de hasta 8 resultados + navegación completa por teclado (Enter/↑/↓/Escape).
 * Todo el estado vive en `useSearchBar`; este componente solo arma el JSX y la
 * semántica ARIA.
 *
 * Combobox implementado a mano siguiendo el patrón ARIA APG (`role="combobox"`
 * en el input + `listbox`/`option` + `aria-activedescendant`) en vez de un
 * primitivo de Radix: Radix no trae un combobox de autocompletado (su
 * `Select` es para listas cerradas, no para buscar contra un backend), y el
 * proyecto no tiene `cmdk`/`Popover` instalados — sumar una dependencia solo
 * para esto no se justifica frente al patrón estándar, que es corto y bien
 * documentado.
 */
export function SearchBar({ className }: SearchBarProps) {
  const sb = useSearchBar()

  const activeOptionId =
    sb.showDropdown && sb.highlightedIndex >= 0
      ? sb.getOptionId(sb.highlightedIndex)
      : undefined

  return (
    <div
      className={cn('relative', className)}
      // Los options tienen tabIndex=-1 y preventDefault en mousedown, así que
      // un click en un resultado nunca dispara este blur (ver SearchResultsDropdown).
      onBlur={(e) => sb.handleBlur(e.currentTarget.contains(e.relatedTarget))}
    >
      <div className="relative">
        <SearchIcon
          className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          role="combobox"
          aria-label={t.search.inputLabel}
          aria-expanded={sb.showDropdown}
          aria-controls={sb.listboxId}
          aria-autocomplete="list"
          aria-activedescendant={activeOptionId}
          placeholder={t.search.placeholder}
          value={sb.query}
          onChange={(e) => sb.handleChange(e.target.value)}
          onFocus={sb.handleFocus}
          onKeyDown={(e) => {
            if (sb.handleKeyDown(e.key)) e.preventDefault()
          }}
          className="pl-8 pr-8"
        />
        {sb.query && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={t.search.clear}
            className="absolute right-0.5 top-1/2 size-7 -translate-y-1/2"
            onClick={sb.closeAndReset}
          >
            <X className="size-3.5" aria-hidden />
          </Button>
        )}
      </div>

      {sb.showDropdown && (
        <SearchResultsDropdown
          id={sb.listboxId}
          hits={sb.hits}
          query={sb.trimmedQuery}
          isLoading={sb.isLoading}
          highlightedIndex={sb.highlightedIndex}
          getOptionId={sb.getOptionId}
          onHoverIndex={sb.setHighlightedIndex}
          onSelectHit={sb.goToHit}
          onSelectSeeAll={() => sb.goToFullResults(sb.trimmedQuery)}
        />
      )}
    </div>
  )
}
