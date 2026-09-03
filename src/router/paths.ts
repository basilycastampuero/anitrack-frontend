/** Rutas de la app (doc 06). Centralizadas para navegación y tests. */
export const paths = {
  home: '/',
  catalog: '/catalog',
  franchise: '/franchise/:id',
  content: '/franchise/:id/content/:contentId',
  search: '/search',
  login: '/login',
  register: '/register',
  authCallback: '/auth/callback',
  myLists: '/my-lists',
  myList: '/my-lists/:checklistId',
  profile: '/profile/:userId',
  publicList: '/profile/:userId/list/:checklistId',
  settings: '/settings',
  devUi: '/dev/ui',
} as const

/**
 * Sanea un `?next=` leído de la query string antes de pasarlo a `navigate()`
 * (doc 12 §5; #4 de la revisión pre-merge de sprint-2-catalogo). `next` viaja
 * en la URL, así que cualquiera puede ponerle lo que quiera — sin esta
 * validación es un open redirect en potencia.
 *
 * Solo se acepta una ruta interna real: debe empezar con un único `/`.
 * Se rechazan además dos formas de escapar del origen sin dejar de "empezar
 * con /": `//evil.com` (URL protocolo-relativa, el navegador la resuelve
 * contra el host de esa barra doble) y `/\evil.com` (algunos navegadores
 * normalizan `\` a `/`, terminando en el mismo caso). Cualquier otra cosa
 * (URL absoluta, `javascript:`, etc.) ya falla el chequeo de "empieza con /".
 */
export function safeNext(raw: string | null | undefined, fallback: string = paths.home): string {
  if (!raw) return fallback
  if (!raw.startsWith('/')) return fallback
  if (raw.startsWith('//') || raw.startsWith('/\\')) return fallback
  return raw
}
