import { useMemo } from 'react'
import { useLibraryIndex } from '@/features/lists/hooks/useLibraryIndex'

/**
 * Predicados sobre el índice de biblioteca (tarea 3.9), para pintar "in your
 * list" en el catálogo.
 *
 * Envuelve `useLibraryIndex` y arma dos `Set` memoizados en vez de dejar que
 * cada caller haga `.includes()` sobre los arrays del contrato: la tabla de
 * versiones consulta una vez por fila, así que un `includes` O(n) ahí es O(n·m)
 * por render. Además concentra en un solo lugar el `useMemo` que hoy estaba
 * copiado en tres páginas.
 *
 * Sin sesión, `useLibraryIndex` no consulta y los dos predicados devuelven
 * `false` — el indicador simplemente no aparece, que es lo correcto: no hay
 * biblioteca de nadie que mostrar.
 */
export function useInLibrary() {
  const { data } = useLibraryIndex()

  return useMemo(() => {
    const versionIds = new Set(data?.versionIds ?? [])
    const franchiseIds = new Set(data?.franchiseIds ?? [])
    return {
      hasVersion: (id: number) => versionIds.has(id),
      hasFranchise: (id: number) => franchiseIds.has(id),
    }
  }, [data])
}
