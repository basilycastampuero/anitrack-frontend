import { useId, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSearch } from '@/features/catalog/hooks/useSearch'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { searchHitPath } from '@/utils/slug'
import { paths } from '@/router/paths'
import type { SearchHit } from '@/features/catalog/types'

const DEBOUNCE_MS = 300
const MIN_QUERY_LENGTH = 2

/**
 * Todo el estado y la lógica de interacción del `SearchBar` (doc 06/07, tarea
 * 2.6): debounce, apertura del dropdown, índice resaltado (cíclico sobre
 * `hits.length + 1`, donde la última opción es siempre "see all") y las
 * acciones de navegación. Separado del componente para que este último quede
 * como wiring de JSX/ARIA puro y para poder testear la máquina de estados sin
 * montar el DOM completo si hiciera falta.
 */
export function useSearchBar() {
  const navigate = useNavigate()
  const listboxId = useId()
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)

  const trimmedQuery = query.trim()
  const debouncedQuery = useDebouncedValue(trimmedQuery, DEBOUNCE_MS)
  const search = useSearch(debouncedQuery)

  const showDropdown = open && trimmedQuery.length >= MIN_QUERY_LENGTH
  // Mientras el debounce no "asentó" el término, tratamos el estado como
  // cargando: evita mostrar resultados de la tecla anterior por unos ms.
  const isLoading = trimmedQuery !== debouncedQuery || search.isFetching
  const hits = search.data ?? []

  function getOptionId(index: number) {
    return `${listboxId}-option-${index}`
  }

  function closeAndReset() {
    setOpen(false)
    setHighlightedIndex(-1)
    setQuery('')
  }

  function goToHit(hit: SearchHit) {
    navigate(searchHitPath(hit))
    closeAndReset()
  }

  function goToFullResults(q: string) {
    if (!q) return
    navigate(`${paths.search}?q=${encodeURIComponent(q)}`)
    closeAndReset()
  }

  function moveHighlight(delta: number) {
    const optionCount = hits.length + 1 // + "see all"
    setHighlightedIndex((current) => {
      const next = current + delta
      if (next < -1) return optionCount - 1
      if (next >= optionCount) return -1
      return next
    })
  }

  function handleChange(value: string) {
    setQuery(value)
    setHighlightedIndex(-1)
    setOpen(true)
  }

  function handleFocus() {
    if (trimmedQuery.length >= MIN_QUERY_LENGTH) setOpen(true)
  }

  /** Devuelve si la tecla fue manejada (para que el componente haga `preventDefault`). */
  function handleKeyDown(key: string): boolean {
    switch (key) {
      case 'ArrowDown':
        if (!showDropdown) setOpen(true)
        else moveHighlight(1)
        return true
      case 'ArrowUp':
        if (showDropdown) moveHighlight(-1)
        return true
      case 'Enter':
        if (highlightedIndex >= 0 && highlightedIndex < hits.length) {
          goToHit(hits[highlightedIndex]!)
        } else {
          goToFullResults(trimmedQuery)
        }
        return true
      case 'Escape':
        if (!open) return false
        setOpen(false)
        setHighlightedIndex(-1)
        return true
      default:
        return false
    }
  }

  /** El widget cierra solo cuando el foco sale del contenedor completo. */
  function handleBlur(nextFocusIsInside: boolean) {
    if (!nextFocusIsInside) {
      setOpen(false)
      setHighlightedIndex(-1)
    }
  }

  return {
    listboxId,
    query,
    trimmedQuery,
    showDropdown,
    isLoading,
    hits,
    highlightedIndex,
    getOptionId,
    setHighlightedIndex,
    handleChange,
    handleFocus,
    handleKeyDown,
    handleBlur,
    closeAndReset,
    goToHit,
    goToFullResults,
  }
}
