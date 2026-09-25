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
    pageOf: (page: number, totalPages: number) =>
      `Page ${page} of ${totalPages}`,
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
    account: {
      /** `aria-label` del trigger: el avatar no tiene texto propio. */
      menu: (name: string) => `Account menu for ${name}`,
      logout: 'Log out',
      loggingOut: 'Logging out…',
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
    /** Etiquetas visibles de las cinco listas sugeridas (doc 12 §3.5c,
     * ADR-003). Las claves son las de `STARTER_LIST_KEYS`
     * (`src/features/lists/constants.ts`) — el valor es también el nombre
     * real que recibe la checklist al crearse, no solo un label de UI. */
    starterLists: {
      watching: 'Watching',
      completed: 'Completed',
      onHold: 'On Hold',
      dropped: 'Dropped',
      planToWatch: 'Plan to Watch',
    },
    starterListsPrompt: {
      title: 'Start tracking in one click',
      body: 'Create five starter lists — Watching, Completed, On Hold, Dropped, Plan to Watch — to sort your entries right away.',
      cta: 'Create starter lists',
      creating: 'Creating…',
      errorFallback: 'Could not create the starter lists. Try again.',
    },
    selectPromptTitle: 'Select a list',
    selectPromptBody: 'Choose a list on the left to see what is in it.',
    entriesEmptyTitle: 'This list is empty',
    entriesEmptyBody: 'Nothing has been added to this list yet.',
    newList: 'New list',
    entry: {
      synced: 'Synced',
      /** `aria-label` de los dos botones del stepper: el número solo no dice
       * de qué título es, y el botón no tiene texto propio. */
      decrease: (name: string) => `One episode less of ${name}`,
      increase: (name: string) => `One episode more of ${name}`,
      progressError: 'Could not save your progress. Try again.',
      editDetails: (name: string) => `Edit details of ${name}`,
      detailsTitle: 'Entry details',
      notesLabel: 'Notes',
      notesPlaceholder: 'What did you think?',
      ratingLabel: 'Your rating',
      ratingValue: (value: number, max: number) => `${value} out of ${max}`,
      clearRating: 'Clear',
      startedAtLabel: 'Started',
      finishedAtLabel: 'Finished',
      save: 'Save',
      saving: 'Saving…',
      cancel: 'Cancel',
      metaError: 'Could not save the changes. Try again.',
    },
    wizard: {
      trigger: 'Add to list',
      title: 'Add to a list',
      versionStep: 'Choose a version',
      targetStep: 'Choose where to put it',
      conflictStep: 'Already in your lists',
      conflictBody: (name: string) =>
        `"${name}" is already in your lists. What do you want to do?`,
      conflictUnknown: 'It is already in one of your lists.',
      conflictIn: (list: string) => `In "${list}"`,
      syncTargetLabel: 'Stay in sync with',
      addAnyway: 'Add anyway',
      syncedCopy: 'Create synced copy',
      syncedCopyHint: 'Episode progress stays in sync between both copies.',
      targetLabel: 'List',
      targetRequired: 'Pick a list first',
      displayNameLabel: 'Show as',
      franchiseNameLabel: 'Franchise name',
      groupLabel: 'Group under the franchise',
      groupHint: 'Keeps every version of the franchise together in one row.',
      back: 'Back',
      cancel: 'Cancel',
      submit: 'Add',
      submitting: 'Adding…',
      added: (name: string) => `${name} added to your list`,
      undo: 'Undo',
      failed: 'Could not add it. Try again.',
      signInTitle: 'Log in to start tracking',
      signInBody:
        'Your lists live in your account. Log in and we bring you right back to this page.',
      signInCta: 'Log in',
      undoFailed: 'Could not undo that. Try again.',
      episodes: (count: number) =>
        count > 0 ? `${count} episodes` : 'Ongoing',
    },
    menu: {
      trigger: (name: string) => `Actions for ${name}`,
      rename: 'Rename',
      newSubList: 'New sub-list',
      publish: 'Publish',
      unpublish: 'Unpublish',
      delete: 'Delete',
    },
    form: {
      createTitle: 'New list',
      createSubtitle: 'Create a new folder to organize your entries.',
      renameTitle: 'Rename list',
      renameSubtitle: 'Change the name of this list.',
      nameLabel: 'Name',
      submitCreate: 'Create',
      submitRename: 'Save',
      submitting: 'Saving…',
      cancel: 'Cancel',
    },
    deleteDialog: {
      title: (name: string) => `Delete "${name}"?`,
      body: (listCount: number, entryCount: number) => {
        if (listCount === 0 && entryCount === 0) {
          return 'This list is empty. This action cannot be undone.'
        }
        const parts: string[] = []
        if (listCount > 0) {
          parts.push(`${listCount} sub-list${listCount === 1 ? '' : 's'}`)
        }
        if (entryCount > 0) {
          parts.push(`${entryCount} ${entryCount === 1 ? 'entry' : 'entries'}`)
        }
        return `This will also delete ${parts.join(' and ')}. This action cannot be undone.`
      },
      confirm: 'Delete',
      confirming: 'Deleting…',
      cancel: 'Cancel',
    },
    errors: {
      nameRequired: 'Name is required',
      saveFailed: 'Could not save the list. Try again.',
      deleteFailed: 'Could not delete the list. Try again.',
      publishFailed: 'Could not update the list. Try again.',
    },
  },
  settings: {
    title: 'Settings',
    themeTitle: 'Appearance',
    themeBody: 'Saved in this browser only, not in your account.',
    accountTitle: 'Account',
    signedInAs: 'Signed in as',
    logoutBody: 'You can log back in any time. Your lists stay on the server.',
  },
  profile: {
    statsTitle: 'Stats',
    totalEntries: 'Titles tracked',
    episodesWatched: 'Episodes watched',
    distribution: 'Games vs videos',
    games: 'Games',
    videos: 'Videos',
    /** Etiqueta accesible de la dona: el SVG va `aria-hidden`. */
    distributionLabel: (games: number, videos: number) =>
      `${videos} videos and ${games} games`,
    publishedLists: 'Public lists',
    entriesCount: (count: number) =>
      `${count} ${count === 1 ? 'entry' : 'entries'}`,
    emptyTitle: 'Nothing public yet',
    emptyBody: 'This user has not published any list.',
    ownBannerTitle: 'These lists are public',
    ownBannerBody: 'Anyone with the link can see the lists you published.',
    ownBannerCta: 'Manage in settings',
    notFoundTitle: 'Profile not found',
    notFoundBody: 'There is no public profile at this address.',
    listUnavailableTitle: 'List not available',
    /** A propósito no dice si la lista existe y es privada, o si no existe. */
    listUnavailableBody: 'This list is private or is no longer available.',
    listEmptyTitle: 'This list is empty',
    listEmptyBody: 'Its owner has not added anything yet.',
    backToProfile: (name: string) => `Back to ${name}`,
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
    promptBody:
      'Type at least 2 characters in the search bar to find franchises and titles.',
    noResultsTitle: 'No results',
    noResultsBody: (q: string) => `We couldn't find anything for "${q}".`,
  },
} as const

export type Strings = typeof en
export const t = en
