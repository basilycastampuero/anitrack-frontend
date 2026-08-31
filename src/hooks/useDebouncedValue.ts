import { useEffect, useState } from 'react'

/**
 * Devuelve `value` retrasado `delayMs` (patrón estándar de debounce por
 * `setTimeout` + cleanup). Genérico: lo usa `SearchBar` (doc 06/07 tarea 2.6)
 * para no disparar `/search` en cada tecla, pero no depende de nada del
 * dominio de catálogo.
 */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs)
    return () => clearTimeout(id)
  }, [value, delayMs])

  return debounced
}
