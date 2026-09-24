import { useNavigate } from 'react-router-dom'
import { useLogout } from '@/features/auth/hooks/useLogout'
import { paths } from '@/router/paths'

/**
 * Cerrar sesión desde la UI: dispara la mutación y saca al usuario de donde
 * esté. Existe para que la decisión de "a dónde vas después" se tome en un
 * solo lugar y no una vez por cada punto de entrada (hoy el menú del header y
 * Settings, mañana los que haya).
 *
 * Navega **enseguida**, sin esperar la respuesta, y eso es deliberado:
 *
 * - `useLogout` limpia la sesión y el cache privado en `onSettled`, no en
 *   `onSuccess`, así que un logout que falla por red igual te deja
 *   deslogueado. Esperar la respuesta no cambiaría el resultado, solo lo
 *   demoraría.
 * - Las páginas de sesión viven detrás de `<RequireAuth>`. Si nos quedáramos
 *   esperando, el `clearSession` desmontaría el componente desde abajo y el
 *   callback de navegación podría no llegar a correr — el mismo problema que
 *   ya nos mordió con el "deshacer" del wizard, donde TanStack no ejecuta los
 *   callbacks pasados a `mutate` si el observer se desmontó.
 */
export function useSignOut() {
  const navigate = useNavigate()
  const logout = useLogout()

  return {
    signOut: () => {
      logout.mutate()
      navigate(paths.home, { replace: true })
    },
    isPending: logout.isPending,
  }
}
