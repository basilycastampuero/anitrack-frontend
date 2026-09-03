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
    previous: 'Previous',
    next: 'Next',
    /** Primer string con interpolación: se declara como función tipada. */
    pageOf: (page: number, totalPages: number) => `Page ${page} of ${totalPages}`,
    readMore: 'Read more',
    readLess: 'Read less',
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
    noResultsTitle: 'No results',
    noResultsBody: 'Try adjusting or clearing your filters.',
    errorTitle: 'Something went wrong',
    errorBody: "We couldn't load this content.",
    notFoundTitle: 'Page not found',
    notFoundBody: "The page you're looking for doesn't exist.",
    franchiseNotFoundTitle: 'Franchise not found',
    franchiseNotFoundBody: "This franchise doesn't exist or was removed.",
    contentNotFoundTitle: 'Content not found',
    contentNotFoundBody: "This content doesn't exist or was removed.",
  },
  card: {
    inYourList: 'In your list',
    games: 'Games',
    videos: 'Videos',
  },
  catalog: {
    filtersLabel: 'Filters',
    allTypes: 'All',
    videoType: 'Video type',
    allVideoTypes: 'All video types',
    genres: 'Genres',
    allGenres: 'All genres',
    platforms: 'Platforms',
    allPlatforms: 'All platforms',
    noOptions: 'No options available',
    /** Segundo string con interpolación (ver `common.pageOf`). */
    itemsSelected: (count: number) => `${count} selected`,
    yearFrom: 'From year',
    yearTo: 'To year',
    sort: 'Sort by',
    sortOptions: {
      default: 'Default',
      name: 'Name (A–Z)',
      releaseDateAsc: 'Oldest first',
      releaseDateDesc: 'Newest first',
    },
  },
  placeholder: {
    comingSoon: 'Coming soon',
    sprint: 'This screen is planned for a later sprint.',
  },
  detail: {
    alsoKnownAs: 'Also known as',
    versionsTableLabel: 'Versions',
    noVersionsTitle: 'No versions listed',
    noVersionsBody: 'This content has no versions yet.',
    version: {
      name: 'Name',
      episodes: 'Episodes',
      episodesUnknown: 'Unknown',
      episodesCount: (n: number) => `${n} episode${n === 1 ? '' : 's'}`,
      releaseDate: 'Release date',
      country: 'Country',
      platform: 'Platform',
      dubbingStudio: 'Dub studio',
    },
    gallery: {
      show: (count: number) => `Show gallery (${count})`,
      hide: 'Hide gallery',
    },
  },
  auth: {
    emailLabel: 'Email',
    passwordLabel: 'Password',
    nameLabel: 'Name',
    login: {
      title: 'Log in',
      subtitle: 'Welcome back. Enter your details to continue.',
      submit: 'Log in',
      submitting: 'Logging in…',
      noAccount: "Don't have an account?",
      registerLink: 'Sign up',
    },
    register: {
      title: 'Create your account',
      subtitle: 'Track everything you watch and play.',
      submit: 'Create account',
      submitting: 'Creating account…',
      haveAccount: 'Already have an account?',
      loginLink: 'Log in',
    },
    errors: {
      emailRequired: 'Email is required',
      emailInvalid: 'Enter a valid email address',
      passwordRequired: 'Password is required',
      passwordTooShort: 'Password must be at least 8 characters',
      nameRequired: 'Name is required',
      invalidCredentials: 'Invalid email or password',
      registrationUnavailable:
        'Registration is currently unavailable. Please try again later.',
    },
    oauth: {
      orDivider: 'or',
      twitch: 'Continue with Twitch',
      disabledInMock:
        "Social login isn't available in mock mode — it needs the real backend.",
    },
    callback: {
      loadingTitle: 'Signing you in…',
      errorTitle: 'Sign-in failed',
      accessDenied: 'You cancelled the sign-in request.',
      genericError: 'Something went wrong finishing sign-in. Please try again.',
      backToLogin: 'Back to log in',
    },
  },
  lists: {
    title: 'My Lists',
    treeLabel: 'Your checklists',
    treeEmptyTitle: 'No lists yet',
    treeEmptyBody: 'Lists you create will show up here.',
    selectPromptTitle: 'Select a list',
    selectPromptBody: 'Choose a list on the left to see what is in it.',
    entriesEmptyTitle: 'This list is empty',
    entriesEmptyBody: 'Nothing has been added to this list yet.',
  },
  search: {
    inputLabel: 'Search franchises and titles',
    placeholder: 'Search…',
    clear: 'Clear search',
    aliasFor: (mainName: string) => `Matches "${mainName}"`,
    loading: 'Searching…',
    noMatches: 'No matches found',
    seeAllResults: (q: string) => `See all results for "${q}"`,
    resultsFor: (q: string) => `Results for "${q}"`,
    promptTitle: 'Search the catalog',
    promptBody: 'Type at least 2 characters in the search bar to find franchises and titles.',
    noResultsTitle: 'No results',
    noResultsBody: (q: string) => `We couldn't find anything for "${q}".`,
  },
} as const

export type Strings = typeof en
export const t = en
