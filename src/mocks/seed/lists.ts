import type { UserSession } from '@/features/auth/types'
import type { ChecklistNode, ListEntry, LibraryIndex } from '@/features/lists/types'
import type { PublicProfile } from '@/features/profile/types'

export const users: UserSession[] = [
  {
    id: 1,
    odooUserId: 11,
    name: 'Alex Rivera',
    email: 'alex@example.com',
    avatarUrl: '/mock-images/avatar-1.svg',
  },
  {
    id: 2,
    odooUserId: 12,
    name: 'Sam Cortez',
    email: 'sam@example.com',
    avatarUrl: null,
  },
]

/** Árbol de checklists por usuario (solo carpetas del usuario, doc 04). */
export const checklistsByUser: Record<number, ChecklistNode[]> = {
  1: [
    {
      id: 1,
      name: 'Watching',
      description: null,
      imageUrl: null,
      order: 0,
      sortingMode: 'N',
      isPublished: true,
      linkCount: 2,
      children: [],
    },
    {
      id: 2,
      name: 'Completed',
      description: null,
      imageUrl: null,
      order: 1,
      sortingMode: 'N',
      isPublished: true,
      linkCount: 1,
      children: [],
    },
    {
      id: 3,
      name: 'Favorites',
      description: 'Curated picks',
      imageUrl: null,
      order: 2,
      sortingMode: 'C',
      isPublished: false,
      linkCount: 0,
      children: [
        {
          id: 4,
          name: 'All-time',
          description: null,
          imageUrl: null,
          order: 0,
          sortingMode: 'C',
          isPublished: false,
          linkCount: 1,
          children: [],
        },
      ],
    },
  ],
  2: [],
}

/** Entries por checklist (doc 04). Incluye un franchise-group agregado. */
export const entriesByChecklist: Record<number, ListEntry[]> = {
  1: [
    {
      linkId: 5000,
      kind: 'version',
      displayName: 'Demon Slayer — Season 1',
      imageUrl: '/mock-images/poster-5.svg',
      order: 0,
      contentType: 'V',
      franchiseId: 3,
      notes: 'Ufotable animation is unreal.',
      version: {
        versionId: 1005,
        contentId: 104,
        abbreviation: 'KnY',
        watchedEpisodes: 12,
        totalEpisodes: 26,
        isSynced: false,
      },
      rating: 9,
      startedAt: '2024-01-05',
      finishedAt: null,
    },
    {
      linkId: 5001,
      kind: 'franchise',
      displayName: 'Spy x Family',
      imageUrl: '/mock-images/poster-3.svg',
      order: 1,
      contentType: 'V',
      franchiseId: 10,
      notes: null,
      showProgress: true,
      aggregatedProgress: {
        groups: [
          { abbreviation: 'S1', watched: 25, total: 25 },
          { abbreviation: 'S2', watched: 3, total: 0 },
        ],
      },
      childEntries: [
        {
          linkId: 5002,
          kind: 'version',
          displayName: 'Season 1',
          imageUrl: '/mock-images/poster-3.svg',
          order: 0,
          contentType: 'V',
          franchiseId: 10,
          notes: null,
          version: {
            versionId: 1017,
            contentId: 113,
            abbreviation: 'S1',
            watchedEpisodes: 25,
            totalEpisodes: 25,
            isSynced: false,
          },
        },
        {
          linkId: 5003,
          kind: 'version',
          displayName: 'Season 2',
          imageUrl: '/mock-images/poster-3.svg',
          order: 1,
          contentType: 'V',
          franchiseId: 10,
          notes: null,
          version: {
            versionId: 1018,
            contentId: 113,
            abbreviation: 'S2',
            watchedEpisodes: 3,
            totalEpisodes: 0,
            isSynced: false,
          },
        },
      ],
    },
  ],
  2: [
    {
      linkId: 5004,
      kind: 'version',
      displayName: 'Your Name',
      imageUrl: '/mock-images/poster-8.svg',
      order: 0,
      contentType: 'V',
      franchiseId: 5,
      notes: null,
      version: {
        versionId: 1010,
        contentId: 107,
        abbreviation: null,
        watchedEpisodes: 1,
        totalEpisodes: 1,
        isSynced: false,
      },
      rating: 10,
      startedAt: '2023-12-01',
      finishedAt: '2023-12-01',
    },
  ],
  4: [
    {
      linkId: 5005,
      kind: 'version',
      displayName: 'Fullmetal Alchemist: Brotherhood',
      imageUrl: '/mock-images/poster-1.svg',
      order: 0,
      contentType: 'V',
      franchiseId: 1,
      notes: null,
      version: {
        versionId: 1000,
        contentId: 100,
        abbreviation: 'FMAB',
        watchedEpisodes: 64,
        totalEpisodes: 64,
        isSynced: false,
      },
      rating: 10,
      startedAt: '2023-06-01',
      finishedAt: '2023-07-10',
    },
  ],
}

export const libraryIndexByUser: Record<number, LibraryIndex> = {
  1: {
    versionIds: [1005, 1017, 1018, 1010, 1000],
    franchiseIds: [3, 10, 5, 1],
  },
  2: { versionIds: [], franchiseIds: [] },
}

/** Perfiles públicos (stats calculados a mano para el seed). */
export const profilesByUser: Record<number, PublicProfile> = {
  1: {
    id: 1,
    name: 'Alex Rivera',
    avatarUrl: '/mock-images/avatar-1.svg',
    stats: {
      totalEntries: 4,
      totalEpisodesWatched: 104,
      byContentType: { games: 0, videos: 4 },
    },
    publishedChecklists: checklistsByUser[1]!.filter((c) => c.isPublished),
  },
  2: {
    id: 2,
    name: 'Sam Cortez',
    avatarUrl: null,
    stats: {
      totalEntries: 0,
      totalEpisodesWatched: 0,
      byContentType: { games: 0, videos: 0 },
    },
    publishedChecklists: [],
  },
}
