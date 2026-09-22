import type { UserSession } from '@/features/auth/types'
import type { ListEntry } from '@/features/lists/types'

/**
 * El árbol tal como lo declara el seed: igual a `ChecklistNode` del contrato
 * pero **sin** el contador de links, porque ese número lo deriva
 * `toChecklistTree` a partir de los entries reales (ADR-022). Escribirlo a
 * mano acá era un mock que mentía: se podía crear un link y ver el contador
 * quieto.
 */
export interface SeedChecklistNode {
  id: number
  name: string
  description: string | null
  imageUrl: string | null
  order: number
  sortingMode: 'C' | 'N'
  isPublished: boolean
  children: SeedChecklistNode[]
}

/** Perfil tal como lo declara el seed: las stats y el bosque publicado se derivan. */
export interface SeedProfile {
  id: number
  name: string
  avatarUrl: string | null
}

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

/**
 * Contraseñas mock para el flujo de login (nunca forman parte del dominio:
 * `UserSession` no tiene password, ver ADR-005). Vive acá, junto a `users`,
 * en vez de en un archivo `auth` separado, porque MSW necesita ambas listas
 * sincronizadas por email — `POST /auth/register` agrega a las dos.
 */
export const mockCredentials: Record<string, string> = {
  'alex@example.com': 'password123',
  'sam@example.com': 'password123',
}

/** Árbol de checklists por usuario (solo carpetas del usuario, doc 04). */
export const checklistsByUser: Record<number, SeedChecklistNode[]> = {
  1: [
    {
      id: 1,
      name: 'Watching',
      description: null,
      imageUrl: null,
      order: 0,
      sortingMode: 'N',
      isPublished: true,
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
      children: [
        {
          id: 4,
          name: 'All-time',
          description: null,
          imageUrl: null,
          order: 0,
          sortingMode: 'C',
          isPublished: false,
          children: [
            {
              id: 5,
              name: 'By decade',
              description: null,
              imageUrl: null,
              order: 1,
              sortingMode: 'C',
              isPublished: false,
              children: [
                {
                  id: 6,
                  name: '2010s',
                  description: null,
                  imageUrl: null,
                  order: 0,
                  sortingMode: 'C',
                  isPublished: false,
                  children: [],
                },
              ],
            },
          ],
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
    /**
     * Copia sincronizada de "Steins;Gate" (link 5006, carpeta "2010s"): el
     * mismo `versionId` vinculado en dos carpetas, con `isSynced` en ambas.
     * En Odoo esto es una fila de `ll.checklist.link.copy` y `Link.write`
     * propaga `lv_episodes` entre las dos; acá el par se reconoce por
     * `isSynced && versionId` (ver `syncedSiblings` en handlers).
     *
     * El seed no tenía ningún par sincronizado, así que la propagación —que
     * es el invariante más caro del modelo— no se podía ni ejercer.
     */
    {
      linkId: 5007,
      kind: 'version',
      displayName: 'Steins;Gate',
      imageUrl: '/mock-images/poster-7.svg',
      order: 1,
      contentType: 'V',
      franchiseId: 9,
      notes: null,
      version: {
        versionId: 1016,
        contentId: 112,
        abbreviation: 'SG',
        watchedEpisodes: 24,
        totalEpisodes: 24,
        isSynced: true,
      },
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
  /**
   * "By decade" (id 5) es un nodo intermedio sin entries propios — solo
   * agrupa "2010s". Existe para que el árbol tenga una rama de 4 niveles
   * real (Favorites > All-time > By decade > 2010s), no solo en el catálogo
   * de Odoo del seed del carril B (ver scripts/seed-odoo.mjs).
   */
  6: [
    {
      linkId: 5006,
      kind: 'version',
      displayName: 'Steins;Gate',
      imageUrl: '/mock-images/poster-7.svg',
      order: 0,
      contentType: 'V',
      franchiseId: 9,
      notes: null,
      version: {
        versionId: 1016,
        contentId: 112,
        abbreviation: 'SG',
        watchedEpisodes: 24,
        totalEpisodes: 24,
        isSynced: true,
      },
      rating: 9,
      startedAt: '2023-02-01',
      finishedAt: '2023-02-20',
    },
  ],
}

/**
 * Identidad pública de cada usuario. Las stats y el bosque de listas
 * publicadas **no** viven acá: los deriva el handler de `/users/:id/profile`
 * con `computeStats` y `publishedForest`. Los valores que estaban escritos a
 * mano (128 episodios, 5 entries) no se correspondían con ningún entry real
 * del seed.
 */
export const profilesByUser: Record<number, SeedProfile> = {
  1: {
    id: 1,
    name: 'Alex Rivera',
    avatarUrl: '/mock-images/avatar-1.svg',
  },
  2: {
    id: 2,
    name: 'Sam Cortez',
    avatarUrl: null,
  },
}

/**
 * Snapshot profundo del seed tal como quedó definido arriba, tomado una sola
 * vez al cargar el módulo (antes de que cualquier handler lo mute). `resetListsSeed`
 * clona este snapshot en cada llamada, así que ninguna mutación posterior de
 * `checklistsByUser`/etc. puede "filtrarse" hacia el propio snapshot.
 *
 * `structuredClone` (no `JSON.parse(JSON.stringify(...))`) porque el árbol de
 * checklists es recursivo y, entre `checklistsByUser` y `profilesByUser`, hay
 * nodos compartidos por referencia (`publishedChecklists` es un `filter` sobre
 * `checklistsByUser[1]`) — el algoritmo de structured clone preserva esas
 * referencias compartidas dentro de un mismo llamado, JSON las rompería en
 * copias independientes sin que importe funcionalmente, pero además JSON
 * pierde `undefined`/no soporta bien objetos grandes con referencias cíclicas
 * si el modelo cambiara a futuro.
 */
const initialSeedSnapshot = structuredClone({
  users,
  mockCredentials,
  checklistsByUser,
  entriesByChecklist,
  profilesByUser,
})

/**
 * Vacía y repuebla un array exportado como `const` en el lugar (no podemos
 * reasignar el binding). Usado por `resetListsSeed` para restaurar arrays de
 * nivel superior como `users`.
 */
function replaceArrayInPlace<T>(target: T[], source: T[]): void {
  target.length = 0
  target.push(...source)
}

/**
 * Igual que `replaceArrayInPlace` pero para los `Record` exportados como
 * `const` (`mockCredentials`, `checklistsByUser`, etc.). `Object.keys` siempre
 * devuelve `string[]` en runtime aunque el tipo declare claves numéricas (los
 * objetos JS solo tienen claves string) — de ahí el cast al borrar.
 */
function replaceRecordInPlace<K extends string | number, V>(
  target: Record<K, V>,
  source: Record<K, V>,
): void {
  for (const key of Object.keys(target)) {
    delete target[key as K]
  }
  Object.assign(target, source)
}

/**
 * Restaura TODO el estado mutable de este módulo (seed de "mis listas") al
 * snapshot inicial, con un clon profundo nuevo en cada llamada. Ver deuda #7
 * (Sprint 3a, bitácora 13): sin esto, un test que crea/renombra/borra algo acá
 * contamina a los que corran después en el mismo archivo, porque
 * `server.resetHandlers()` solo resetea handlers de MSW, no datos.
 *
 * No toca `currentUserId` (vive en `@/mocks/handlers`, no es parte del seed)
 * ni `franchises`/`masters` (nunca se mutan: todos los endpoints de catálogo
 * son de solo lectura). Ver `@/mocks/reset` para el reset combinado.
 */
export function resetListsSeed(): void {
  const fresh = structuredClone(initialSeedSnapshot)
  replaceArrayInPlace(users, fresh.users)
  replaceRecordInPlace(mockCredentials, fresh.mockCredentials)
  replaceRecordInPlace(checklistsByUser, fresh.checklistsByUser)
  replaceRecordInPlace(entriesByChecklist, fresh.entriesByChecklist)
  replaceRecordInPlace(profilesByUser, fresh.profilesByUser)
}
