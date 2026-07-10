/**
 * Todos los strings visibles de la UI (ADR-007). v1 solo inglés, sin librería
 * i18n: un objeto tipado. Añadir `es.ts` + switcher es de bajo costo si el
 * cliente lo pide.
 */
export const en = {
  app: {
    name: 'AniTrack',
    tagline: 'Find and track your games and anime',
  },
  nav: {
    home: 'Home',
    catalog: 'Catalog',
    search: 'Search',
    myLists: 'My Lists',
    profile: 'Profile',
    settings: 'Settings',
    login: 'Log in',
  },
  theme: {
    toggle: 'Toggle theme',
    light: 'Light',
    dark: 'Dark',
    system: 'System',
  },
  common: {
    retry: 'Try again',
    clearFilters: 'Clear filters',
    loading: 'Loading…',
    search: 'Search',
  },
  home: {
    heroTitle: 'Track everything you watch and play',
    heroSubtitle:
      'Build your own lists, follow episode progress, and explore a shared catalog.',
    recentlyAdded: 'Recently added',
    browseCatalog: 'Browse catalog',
  },
  states: {
    emptyCatalogTitle: 'Nothing here yet',
    emptyCatalogBody: 'The catalog is empty. Check back soon.',
    errorTitle: 'Something went wrong',
    errorBody: "We couldn't load this content.",
    notFoundTitle: 'Page not found',
    notFoundBody: "The page you're looking for doesn't exist.",
  },
  card: {
    inYourList: 'In your list',
    games: 'Games',
    videos: 'Videos',
  },
  placeholder: {
    comingSoon: 'Coming soon',
    sprint: 'This screen is planned for a later sprint.',
  },
} as const

export type Strings = typeof en
export const t = en
