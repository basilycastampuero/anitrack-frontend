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
