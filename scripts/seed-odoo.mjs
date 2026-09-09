#!/usr/bin/env node
/**
 * Carga el catálogo de prueba en el Odoo local (ll_checklist).
 *
 * Replica el mismo dataset que sirve MSW (`src/mocks/seed/franchises.ts`) para
 * que el spike de integración real (tarea 2.8) sea una comparación A/B honesta:
 * los mismos datos, una vez por el mock y otra por el backend. Los datos se
 * declaran acá en plano y no se importan del seed TS porque ese archivo usa el
 * alias `@/` de Vite, que Node no resuelve; además lo que hace este script no
 * es copiar objetos sino traducirlos al vocabulario del ORM de Odoo
 * (`franchise_name_ids`, `content_type`, `version_episodes`, …).
 *
 * Es idempotente: busca por nombre antes de crear, así que se puede correr
 * las veces que haga falta sin duplicar. Con `--reset` borra primero las
 * franquicias del seed (y en cascada sus contents/versions/nombres).
 *
 * Uso:
 *   node scripts/seed-odoo.mjs
 *   node scripts/seed-odoo.mjs --reset
 *   ODOO_URL=http://localhost:8069 ODOO_DB=anitrack node scripts/seed-odoo.mjs
 */

import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

const CONFIG = {
  url: process.env.ODOO_URL ?? 'http://localhost:8069',
  db: process.env.ODOO_DB ?? 'anitrack',
  user: process.env.ODOO_USER ?? 'admin',
  password: process.env.ODOO_PASSWORD ?? 'admin',
}

const RESET = process.argv.includes('--reset')

/* ------------------------------------------------------------------ *
 * Cliente JSON-RPC
 * ------------------------------------------------------------------ */

let rpcId = 0

async function rpc(service, method, args) {
  const res = await fetch(`${CONFIG.url}/jsonrpc`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'call',
      params: { service, method, args },
      id: ++rpcId,
    }),
  })

  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${res.statusText} en ${CONFIG.url}/jsonrpc`)
  }

  const body = await res.json()
  if (body.error) {
    const data = body.error.data ?? {}
    const err = new Error(data.message ?? body.error.message ?? 'Error RPC desconocido')
    err.odooType = data.name ?? ''
    throw err
  }
  return body.result
}

let uid = null

async function authenticate() {
  uid = await rpc('common', 'authenticate', [CONFIG.db, CONFIG.user, CONFIG.password, {}])
  if (!uid) {
    throw new Error(
      `Autenticación rechazada para "${CONFIG.user}" en la base "${CONFIG.db}". ` +
        'Revisá ODOO_DB / ODOO_USER / ODOO_PASSWORD.',
    )
  }
  return uid
}

function execKw(model, method, args = [], kwargs = {}) {
  return rpc('object', 'execute_kw', [CONFIG.db, uid, CONFIG.password, model, method, args, kwargs])
}

const search = (model, domain, kwargs = {}) => execKw(model, 'search', [domain], kwargs)
const searchRead = (model, domain, fields) =>
  execKw(model, 'search_read', [domain], { fields })
const create = (model, vals) => execKw(model, 'create', [vals])
const write = (model, ids, vals) => execKw(model, 'write', [ids, vals])
const unlink = (model, ids) => execKw(model, 'unlink', [ids])

/** Busca por dominio; si no existe, crea. Devuelve `{ id, created }`. */
async function ensure(model, domain, vals) {
  const found = await search(model, domain, { limit: 1 })
  if (found.length) return { id: found[0], created: false }
  return { id: await create(model, vals), created: true }
}

/* ------------------------------------------------------------------ *
 * Datos maestros (espejo de src/mocks/seed/masters.ts)
 * ------------------------------------------------------------------ */

const GENRES = [
  ['Action', 1], ['Adventure', 2], ['Comedy', 3], ['Drama', 4],
  ['Fantasy', 5], ['Sci-Fi', 6], ['Slice of Life', 7], ['Mystery', 8],
  ['Romance', 9], ['Horror', 10], ['RPG', 11],
]

const PLATFORMS = [
  ['Netflix', 'platform-netflix.svg'],
  ['Crunchyroll', 'platform-crunchyroll.svg'],
  ['Nintendo Switch', 'platform-switch.svg'],
  ['Steam', 'platform-steam.svg'],
  ['Blu-ray', null],
]

const COMPANIES = [
  ['Studio Bones', 'Animation Studio'],
  ['Game Freak', 'Game Developer'],
  ['Funimation', 'Dubbing Studio'],
  ['CD Projekt Red', 'Game Developer'],
  ['Ufotable', 'Animation Studio'],
  ['AniLatino', 'Dubbing Studio'],
]

const COUNTRIES = [
  ['Japan', 'flag-jp.svg', 'ja'],
  ['United States', 'flag-us.svg', 'en'],
  ['Mexico', 'flag-mx.svg', 'es'],
]

/** `alt` del seed TS: los códigos ISO se resuelven contra res.lang. */
const LANG_BY_CODE = { en: 'en_US', ja: 'ja_JP', es: 'es_ES' }

/* ------------------------------------------------------------------ *
 * Catálogo (espejo de src/mocks/seed/franchises.ts)
 * ------------------------------------------------------------------ */

const v = (name, episodes, releaseDate, extra = {}) => ({
  name, episodes, releaseDate, order: 0, country: null,
  dubbingStudio: null, platform: null, ...extra,
})

const FRANCHISES = [
  {
    name: 'Fullmetal Alchemist',
    names: [['Fullmetal Alchemist', 'en'], ['鋼の錬金術師', 'ja'], ['Hagane no Renkinjutsushi', 'ja']],
    description:
      'Two brothers search for the Philosopher’s Stone to restore their bodies after a failed alchemical ritual.',
    poster: 'poster-1.svg',
    gallery: [['Key visual', 'poster-1.svg'], ['Cover', 'poster-2.svg']],
    contents: [
      {
        name: 'Brotherhood', names: [['Brotherhood', 'en']], abbreviation: 'FMAB',
        description: 'The 2009 retelling that follows the manga to its end.',
        poster: 'poster-1.svg', type: 'V', videoType: 'TV', order: 0,
        genres: ['Action', 'Adventure', 'Fantasy'], companies: ['Studio Bones'],
        versions: [
          v('Original Japanese', 64, '2009-04-05', { country: 'Japan', platform: 'Crunchyroll' }),
          v('English Dub', 64, '2010-02-13', {
            order: 1, country: 'United States', dubbingStudio: 'Funimation', platform: 'Netflix',
          }),
        ],
      },
      {
        name: 'The Sacred Star of Milos', names: [['The Sacred Star of Milos', 'en']],
        abbreviation: null, description: 'A feature film set during the Brotherhood timeline.',
        poster: 'poster-2.svg', type: 'V', videoType: 'M', order: 1,
        genres: ['Action', 'Fantasy'], companies: ['Studio Bones'],
        versions: [v('Movie', 1, '2011-07-02', { country: 'Japan', platform: 'Blu-ray' })],
      },
    ],
  },
  {
    name: 'Pokémon',
    names: [['Pokémon', 'en'], ['ポケモン', 'ja'], ['Pocket Monsters', 'ja']],
    description:
      'Trainers explore regions, catch creatures, and battle across an ever-expanding world spanning games and anime.',
    poster: 'poster-3.svg',
    gallery: [['Key visual', 'poster-3.svg']],
    contents: [
      {
        name: 'Scarlet', names: [['Pokémon Scarlet', 'en']], abbreviation: 'SV',
        description: 'An open-world adventure in the Paldea region.',
        poster: 'poster-4.svg', type: 'G', videoType: null, order: 0,
        genres: ['Adventure', 'RPG'], companies: ['Game Freak'],
        versions: [v('Switch', 0, '2022-11-18', { country: 'Japan', platform: 'Nintendo Switch' })],
      },
      {
        name: 'Pokémon Horizons', names: [['Pokémon Horizons', 'en']], abbreviation: 'PH',
        description: 'A new series following Liko and Roy. Currently airing.',
        poster: 'poster-3.svg', type: 'V', videoType: 'TV', order: 0,
        genres: ['Adventure', 'Comedy'], companies: [],
        // episodes 0 = en emisión, total desconocido
        versions: [v('Original Japanese', 0, '2023-04-14', { country: 'Japan', platform: 'Crunchyroll' })],
      },
    ],
  },
  {
    name: 'Demon Slayer',
    names: [['Demon Slayer', 'en'], ['鬼滅の刃', 'ja'], ['Kimetsu no Yaiba', 'ja']],
    description: 'A young man becomes a demon slayer to avenge his family and cure his sister.',
    poster: 'poster-5.svg',
    gallery: [['Key visual', 'poster-5.svg']],
    contents: [
      {
        name: 'Kimetsu no Yaiba', names: [['Kimetsu no Yaiba', 'ja']], abbreviation: 'KnY',
        description: 'The animated adaptation by Ufotable.',
        poster: 'poster-5.svg', type: 'V', videoType: 'TV', order: 0,
        genres: ['Action', 'Fantasy', 'Drama'], companies: ['Ufotable'],
        versions: [
          v('Season 1 (JP)', 26, '2019-04-06', { country: 'Japan', platform: 'Crunchyroll' }),
          v('Season 2 (JP)', 18, '2021-12-05', { order: 1, country: 'Japan', platform: 'Crunchyroll' }),
          v('Latino Dub', 26, '2020-01-10', {
            order: 2, country: 'Mexico', dubbingStudio: 'AniLatino', platform: 'Netflix',
          }),
        ],
      },
    ],
  },
  {
    name: 'The Witcher',
    names: [['The Witcher', 'en'], ['Wiedźmin', null]],
    description:
      'Geralt of Rivia, a monster hunter, navigates a morally grey world across games and a live-action series.',
    poster: 'poster-6.svg',
    gallery: [['Key visual', 'poster-6.svg']],
    contents: [
      {
        name: 'The Witcher 3: Wild Hunt', names: [['Wild Hunt', 'en']], abbreviation: 'TW3',
        description: 'An open-world RPG following Geralt and Ciri.',
        poster: 'poster-6.svg', type: 'G', videoType: null, order: 0,
        genres: ['RPG', 'Adventure', 'Drama'], companies: ['CD Projekt Red'],
        versions: [v('PC', 0, '2015-05-19', { country: 'United States', platform: 'Steam' })],
      },
      {
        name: 'The Witcher (Series)', names: [['The Witcher', 'en']], abbreviation: null,
        description: 'The Netflix live-action adaptation.',
        poster: 'poster-7.svg', type: 'V', videoType: 'S', order: 0,
        genres: ['Fantasy', 'Adventure'], companies: [],
        versions: [v('Season 1', 8, '2019-12-20', { country: 'United States', platform: 'Netflix' })],
      },
    ],
  },
  {
    name: 'Your Name',
    names: [['Your Name', 'en'], ['君の名は。', 'ja'], ['Kimi no Na wa', 'ja']],
    description:
      'Two teenagers share a profound, magical connection as they swap bodies across time and distance.',
    poster: 'poster-8.svg',
    gallery: [['Key visual', 'poster-8.svg']],
    contents: [
      {
        name: 'Kimi no Na wa', names: [['Kimi no Na wa', 'ja']], abbreviation: null,
        description: 'Makoto Shinkai’s record-breaking film.',
        poster: 'poster-8.svg', type: 'V', videoType: 'M', order: 0,
        genres: ['Romance', 'Drama', 'Fantasy'], companies: [],
        versions: [v('Movie', 1, '2016-08-26', { country: 'Japan', platform: 'Crunchyroll' })],
      },
    ],
  },
  {
    name: 'Cyberpunk: Edgerunners',
    names: [['Edgerunners', 'en']],
    description: 'A street kid tries to survive in a technology-obsessed city of the future.',
    poster: 'poster-2.svg', gallery: [],
    contents: [
      {
        name: 'Edgerunners', names: [['Edgerunners', 'en']], abbreviation: null,
        description: 'A Studio Trigger ONA set in Night City.',
        poster: 'poster-2.svg', type: 'V', videoType: 'ONA', order: 0,
        genres: ['Sci-Fi', 'Action'], companies: [],
        versions: [v('Original', 10, '2022-09-13', { country: 'Japan', platform: 'Netflix' })],
      },
    ],
  },
  {
    name: 'Attack on Titan',
    names: [['Attack on Titan', 'en'], ['進撃の巨人', 'ja'], ['Shingeki no Kyojin', 'ja']],
    description: 'Humanity fights for survival against giant humanoid Titans behind enormous walls.',
    poster: 'poster-4.svg', gallery: [],
    contents: [
      {
        name: 'Shingeki no Kyojin', names: [['Shingeki no Kyojin', 'ja']], abbreviation: 'AoT',
        description: 'The WIT/MAPPA adaptation.',
        poster: 'poster-4.svg', type: 'V', videoType: 'TV', order: 0,
        genres: ['Action', 'Drama', 'Mystery'], companies: [],
        versions: [
          v('Season 1', 25, '2013-04-07', { country: 'Japan', platform: 'Crunchyroll' }),
          v('The Final Season', 0, '2020-12-07', { order: 1, country: 'Japan', platform: 'Crunchyroll' }),
        ],
      },
    ],
  },
  {
    name: 'Hollow Knight',
    names: [['Hollow Knight', 'en']],
    description: 'A lone knight explores the ruined, insect-filled kingdom of Hallownest.',
    poster: 'poster-6.svg', gallery: [],
    contents: [
      {
        name: 'Hollow Knight', names: [['Hollow Knight', 'en']], abbreviation: 'HK',
        description: 'A hand-drawn metroidvania by Team Cherry.',
        poster: 'poster-6.svg', type: 'G', videoType: null, order: 0,
        genres: ['Adventure', 'Fantasy'], companies: [],
        versions: [v('PC', 0, '2017-02-24', { country: 'United States', platform: 'Steam' })],
      },
    ],
  },
  {
    name: 'Steins;Gate',
    names: [['Steins;Gate', 'en'], ['シュタインズ・ゲート', 'ja']],
    description: 'A self-proclaimed mad scientist discovers a way to send messages to the past.',
    poster: 'poster-7.svg', gallery: [],
    contents: [
      {
        name: 'Steins;Gate (VN)', names: [['Steins;Gate', 'en']], abbreviation: null,
        description: 'The original visual novel.',
        poster: 'poster-7.svg', type: 'G', videoType: null, order: 0,
        genres: ['Sci-Fi', 'Mystery'], companies: [],
        versions: [v('PC', 0, '2009-10-15', { country: 'Japan', platform: 'Steam' })],
      },
      {
        name: 'Steins;Gate (Anime)', names: [['Steins;Gate', 'en']], abbreviation: 'SG',
        description: 'The White Fox adaptation.',
        poster: 'poster-7.svg', type: 'V', videoType: 'TV', order: 0,
        genres: ['Sci-Fi', 'Mystery', 'Drama'], companies: [],
        versions: [v('Original Japanese', 24, '2011-04-06', { country: 'Japan', platform: 'Crunchyroll' })],
      },
    ],
  },
  {
    name: 'Spy x Family',
    names: [['Spy x Family', 'en'], ['スパイファミリー', 'ja']],
    description:
      'A spy builds a fake family to complete a mission — unaware his wife is an assassin and his daughter a telepath.',
    poster: 'poster-3.svg', gallery: [],
    contents: [
      {
        name: 'Spy x Family', names: [['Spy x Family', 'en']], abbreviation: 'SxF',
        description: 'The WIT/CloverWorks comedy.',
        poster: 'poster-3.svg', type: 'V', videoType: 'TV', order: 0,
        genres: ['Action', 'Comedy', 'Slice of Life'], companies: [],
        versions: [
          v('Season 1 (JP)', 25, '2022-04-09', { country: 'Japan', platform: 'Crunchyroll' }),
          v('Season 2 (JP)', 0, '2023-10-07', { order: 1, country: 'Japan', platform: 'Crunchyroll' }),
        ],
      },
    ],
  },
]

/* ------------------------------------------------------------------ *
 * Listas de usuario (espejo de src/mocks/seed/lists.ts, Sprint 3a — B2)
 * ------------------------------------------------------------------ *
 *
 * Réplica del seed de MSW en el Odoo local: mismos dos usuarios
 * (alex@example.com poblado, sam@example.com vacío), mismas credenciales
 * (`password123`) y el mismo árbol de checklists, para que B3/B4 (endpoints
 * `/me/*`) tengan datos reales contra los que verificar el contrato.
 *
 * Tres propiedades del modelo de Chano que esta sección respeta a propósito
 * (doc 12 §4, ADR-018/019):
 *
 * 1. **Nunca se busca una checklist "sombra" (`checklist_database = true`)
 *    por nombre.** `Link.compute_show_name` reescribe
 *    `link_record_id.checklist_name` como efecto secundario apenas se crea
 *    el link (le agrega el progreso, ej. "Spy x Family [S1 25/25]"), así que
 *    una segunda corrida que buscara por el nombre original no la
 *    encontraría y duplicaría todo. La identidad de una sombra es "la que
 *    cuelga de este link"; se llega a ella leyendo `link.link_record_id`,
 *    nunca buscándola de forma independiente.
 * 2. **Dentro de cada link: primero se crea la sombra, después el link**
 *    (`ensureFranchiseLink`/`ensureVersionLink` abajo), igual que
 *    `wizard/link.py` hace con su `create()` anidado — acá son dos llamadas
 *    RPC separadas y secuenciales en vez de una expresión anidada, pero el
 *    orden es el mismo y el resultado final es idéntico.
 * 3. **Un franchise-link agrupado y sus hijos comparten `link_checklist_id`**
 *    (la carpeta del usuario), pero el `checklist_parent_id` de la sombra de
 *    cada hijo apunta a la sombra del franchise-link, no a la carpeta. Son
 *    dos jerarquías distintas que se solapan: la del usuario (carpetas) y la
 *    de las sombras (solo para que Odoo pueda mostrar el franchise-link como
 *    checklist "contenedora" en el backoffice).
 *
 * El árbol de Alex reproduce dos casos de verificación que exige el plan de
 * B3: una rama de 4 niveles (Favorites > All-time > By decade > 2010s) y
 * "Watching", que tiene 4 filas de `ll.checklist.link` (el version-link
 * suelto + el franchise-link + sus 2 hijos) pero `linkCount` debe dar 2 (el
 * franchise-link no cuenta a sus propios hijos) — el caso que detecta un
 * doble conteo si el filtro `lv_link_franchise_id = false` de B3 está mal.
 */

const LISTS_SEED = [
  {
    login: 'alex@example.com',
    password: 'password123',
    name: 'Alex Rivera',
    folders: [
      {
        name: 'Watching',
        sortingMode: 'N',
        isPublished: true,
        entries: [
          {
            kind: 'version',
            franchise: 'Demon Slayer',
            content: 'Kimetsu no Yaiba',
            version: 'Season 1 (JP)',
            displayName: 'Demon Slayer — Season 1',
            abbreviation: 'KnY',
            watched: 12,
          },
          {
            kind: 'franchise',
            franchise: 'Spy x Family',
            displayName: 'Spy x Family',
            children: [
              {
                franchise: 'Spy x Family',
                content: 'Spy x Family',
                version: 'Season 1 (JP)',
                displayName: 'Season 1',
                abbreviation: 'S1',
                watched: 25,
              },
              {
                franchise: 'Spy x Family',
                content: 'Spy x Family',
                version: 'Season 2 (JP)',
                displayName: 'Season 2',
                abbreviation: 'S2',
                watched: 3,
              },
            ],
          },
        ],
      },
      {
        name: 'Completed',
        sortingMode: 'N',
        isPublished: true,
        entries: [
          {
            kind: 'version',
            franchise: 'Your Name',
            content: 'Kimi no Na wa',
            version: 'Movie',
            displayName: 'Your Name',
            abbreviation: null,
            watched: 1,
          },
        ],
      },
      {
        name: 'Favorites',
        description: 'Curated picks',
        sortingMode: 'C',
        isPublished: false,
        entries: [],
        folders: [
          {
            name: 'All-time',
            sortingMode: 'C',
            isPublished: false,
            entries: [
              {
                kind: 'version',
                franchise: 'Fullmetal Alchemist',
                content: 'Brotherhood',
                version: 'Original Japanese',
                displayName: 'Fullmetal Alchemist: Brotherhood',
                abbreviation: 'FMAB',
                watched: 64,
              },
            ],
            folders: [
              {
                name: 'By decade',
                sortingMode: 'C',
                isPublished: false,
                entries: [],
                folders: [
                  {
                    name: '2010s',
                    sortingMode: 'C',
                    isPublished: false,
                    entries: [
                      {
                        kind: 'version',
                        franchise: 'Steins;Gate',
                        content: 'Steins;Gate (Anime)',
                        version: 'Original Japanese',
                        displayName: 'Steins;Gate',
                        abbreviation: 'SG',
                        watched: 24,
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    login: 'sam@example.com',
    password: 'password123',
    name: 'Sam Cortez',
    folders: [],
  },
]

/** Cache de referencias de catálogo resueltas (franquicia/content/version). */
const catalogRefCache = new Map()

async function resolveVersionRef(franchiseName, contentName, versionName) {
  const key = `${franchiseName}::${contentName}::${versionName}`
  if (catalogRefCache.has(key)) return catalogRefCache.get(key)

  const franchiseIds = await findFranchiseIds(franchiseName)
  if (!franchiseIds.length) {
    throw new Error(
      `seedLists: franquicia "${franchiseName}" no existe — corré primero el seed de catálogo`,
    )
  }
  const franchiseId = franchiseIds[0]

  const contentId = await findContentId(contentName, franchiseId)
  if (!contentId) {
    throw new Error(`seedLists: content "${contentName}" no existe en la franquicia "${franchiseName}"`)
  }

  const [content] = await execKw('ll.checklist.content', 'read', [[contentId]], {
    fields: ['content_type'],
  })
  const versions = await searchRead(
    'll.checklist.version',
    [['version_content_id', '=', contentId], ['version_name', '=', versionName]],
    ['id'],
  )
  if (!versions.length) {
    throw new Error(`seedLists: version "${versionName}" no existe en el content "${contentName}"`)
  }

  const ref = {
    franchiseId,
    contentId,
    versionId: versions[0].id,
    contentType: content.content_type,
  }
  catalogRefCache.set(key, ref)
  return ref
}

async function franchiseImageRefs(franchiseId) {
  const [f] = await execKw('ll.checklist.franchise', 'read', [[franchiseId]], {
    fields: ['franchise_image_group_id', 'franchise_image_id'],
  })
  return {
    groupId: f.franchise_image_group_id ? f.franchise_image_group_id[0] : false,
    imageId: f.franchise_image_id ? f.franchise_image_id[0] : false,
  }
}

async function contentImageId(contentId) {
  const [c] = await execKw('ll.checklist.content', 'read', [[contentId]], {
    fields: ['content_image_id'],
  })
  return c.content_image_id ? c.content_image_id[0] : false
}

/** Alta idempotente de la cuenta portal. Usa `signup()`, el mismo método que
 * `POST /api/v1/auth/register` (ADR-015), para que el usuario quede en el
 * mismo grupo (Portal) que produciría un alta real. */
async function ensureResUser({ login, name, password }) {
  const found = await search('res.users', [['login', '=', login]], { limit: 1 })
  if (found.length) return { id: found[0], created: false }

  await execKw('res.users', 'signup', [{ login, email: login, name, password }])
  const created = await search('res.users', [['login', '=', login]], { limit: 1 })
  if (!created.length) {
    throw new Error(`seedLists: signup() no creó el usuario "${login}"`)
  }
  return { id: created[0], created: true }
}

/** Idem con el perfil `ll.checklist.user`, reutilizando `extra_get_user`
 * (el mismo get-or-create que ADR-015 fija como única vía de resolución). */
async function ensureUserProfile(resUserId) {
  const found = await search('ll.checklist.user', [['user_res_user_id', '=', resUserId]], {
    limit: 1,
  })
  if (found.length) return found[0]

  // extra_get_user(self, uid) no lleva @api.model: por RPC el primer elemento
  // de `args` es siempre la lista de ids a la que se ata `self` (acá vacía,
  // igual que `request.env["ll.checklist.user"]` en el controlador real es
  // un recordset vacío), y recién el segundo es el `uid` real del método.
  await execKw('ll.checklist.user', 'extra_get_user', [[], resUserId])
  const created = await search('ll.checklist.user', [['user_res_user_id', '=', resUserId]], {
    limit: 1,
  })
  if (!created.length) {
    throw new Error(`seedLists: extra_get_user() no creó el perfil para res.users ${resUserId}`)
  }
  return created[0]
}

/** Carpeta real del usuario (`checklist_database = false`). A diferencia de
 * las sombras, su nombre nunca lo reescribe `compute_show_name` (ese compute
 * solo toca `link_record_id`), así que buscarla por nombre es seguro. */
async function ensureChecklistFolder({ profileId, parentId, name, description, order, sortingMode, isPublished }) {
  const domain = [
    ['checklist_user_id', '=', profileId],
    ['checklist_parent_id', '=', parentId || false],
    ['checklist_name', '=', name],
    ['checklist_database', '=', false],
  ]
  const found = await search('ll.checklist.checklist', domain, { limit: 1 })
  if (found.length) return { id: found[0], created: false }

  const id = await create('ll.checklist.checklist', {
    checklist_user_id: profileId,
    checklist_parent_id: parentId || false,
    checklist_name: name,
    checklist_description: description || false,
    checklist_order: order,
    checklist_sorting_mode: sortingMode,
    checklist_published: isPublished,
    checklist_shared: true,
    checklist_type: 'S',
    checklist_database: false,
  })
  return { id, created: true }
}

/** Franchise-link agrupado (`link_version_id = false`). Identidad estructural:
 * (carpeta, franquicia, tipo de contenido, sin versión) — nunca por nombre,
 * ver nota 1 del bloque. Devuelve también `shadowId` porque los hijos
 * agrupados necesitan la sombra del franchise-link como `checklist_parent_id`. */
async function ensureFranchiseLink({ checklistId, profileId, franchiseId, contentType, displayName, order, franchiseImages }) {
  const domain = [
    ['link_checklist_id', '=', checklistId],
    ['link_franchise_id', '=', franchiseId],
    ['link_content_type', '=', contentType],
    ['link_version_id', '=', false],
  ]
  const existing = await search('ll.checklist.link', domain, { limit: 1 })
  if (existing.length) {
    const [row] = await execKw('ll.checklist.link', 'read', [existing], { fields: ['link_record_id'] })
    return { id: existing[0], shadowId: row.link_record_id[0], created: false }
  }

  // Primero la sombra (nota 2 del bloque), después el link.
  const shadowId = await create('ll.checklist.checklist', {
    checklist_user_id: profileId,
    checklist_order: order,
    checklist_name: displayName,
    checklist_published: true,
    checklist_shared: true,
    checklist_image_group_id: franchiseImages.groupId,
    checklist_image_id: franchiseImages.imageId,
    checklist_type: 'S',
    checklist_parent_id: checklistId,
    checklist_database: true,
  })
  const linkId = await create('ll.checklist.link', {
    link_checklist_id: checklistId,
    link_franchise_id: franchiseId,
    link_content_type: contentType,
    link_name: displayName,
    link_record_id: shadowId,
  })
  return { id: linkId, shadowId, created: true }
}

/** Version-link, suelto o agrupado bajo un franchise-link. Identidad
 * estructural: (carpeta, versión) — igual criterio que el franchise-link. */
async function ensureVersionLink({
  checklistId, profileId, franchiseId, contentType, versionId,
  displayName, abbreviation, watched, order,
  franchiseLinkId, shadowParentId, franchiseImages, contentImage,
}) {
  const domain = [
    ['link_checklist_id', '=', checklistId],
    ['link_version_id', '=', versionId],
  ]
  const existing = await search('ll.checklist.link', domain, { limit: 1 })
  if (existing.length) return { id: existing[0], created: false }

  // Primero la sombra (nota 2 del bloque), después el link.
  const shadowId = await create('ll.checklist.checklist', {
    checklist_user_id: profileId,
    checklist_order: order,
    checklist_name: displayName,
    checklist_published: true,
    checklist_shared: true,
    checklist_image_group_id: franchiseImages.groupId,
    checklist_image_id: contentImage,
    checklist_type: 'R',
    checklist_parent_id: shadowParentId,
    checklist_database: true,
  })
  const linkId = await create('ll.checklist.link', {
    link_checklist_id: checklistId,
    link_franchise_id: franchiseId,
    link_content_type: contentType,
    link_version_id: versionId,
    link_name: displayName,
    link_record_id: shadowId,
    lv_abbreviation: abbreviation || false,
    lv_episodes: watched || 0,
    lv_link_franchise_id: franchiseLinkId || false,
  })
  return { id: linkId, created: true }
}

async function seedVersionEntry(e, ctx, order, depth) {
  const ref = await resolveVersionRef(e.franchise, e.content, e.version)
  const franchiseImages = await franchiseImageRefs(ref.franchiseId)
  const contentImage = await contentImageId(ref.contentId)

  const grouped = Boolean(ctx.franchiseLinkId)
  const link = await ensureVersionLink({
    checklistId: ctx.checklistId,
    profileId: ctx.profileId,
    franchiseId: ref.franchiseId,
    contentType: ref.contentType,
    versionId: ref.versionId,
    displayName: e.displayName,
    abbreviation: e.abbreviation,
    watched: e.watched,
    order,
    franchiseLinkId: ctx.franchiseLinkId || false,
    // Sin agrupar: la sombra cuelga de la carpeta. Agrupado: cuelga de la
    // sombra del franchise-link (nota 3 del bloque).
    shadowParentId: grouped ? ctx.shadowParentId : ctx.checklistId,
    franchiseImages,
    contentImage,
  })
  log(`${'  '.repeat(depth + 3)}${link.created ? '+' : '='} version-link ${e.displayName} (id ${link.id})`)
}

async function seedFranchiseGroup(e, ctx, order, depth) {
  const franchiseIds = await findFranchiseIds(e.franchise)
  if (!franchiseIds.length) {
    throw new Error(`seedLists: franquicia "${e.franchise}" no existe — corré primero el seed de catálogo`)
  }
  const franchiseId = franchiseIds[0]
  // El content_type del franchise-link sale del primer hijo agrupado, igual
  // que en el wizard (wl_content_id.content_type de la primera versión).
  const firstChildRef = await resolveVersionRef(e.children[0].franchise, e.children[0].content, e.children[0].version)
  const franchiseImages = await franchiseImageRefs(franchiseId)

  const franchiseLink = await ensureFranchiseLink({
    checklistId: ctx.checklistId,
    profileId: ctx.profileId,
    franchiseId,
    contentType: firstChildRef.contentType,
    displayName: e.displayName,
    order,
    franchiseImages,
  })
  log(`${'  '.repeat(depth + 3)}${franchiseLink.created ? '+' : '='} franchise-link ${e.displayName} (id ${franchiseLink.id})`)

  let childOrder = 0
  for (const child of e.children) {
    await seedVersionEntry(
      child,
      { profileId: ctx.profileId, checklistId: ctx.checklistId, franchiseLinkId: franchiseLink.id, shadowParentId: franchiseLink.shadowId },
      childOrder,
      depth + 1,
    )
    childOrder++
  }
}

async function seedFolders(folders, ctx, depth) {
  let order = 0
  for (const f of folders) {
    const folder = await ensureChecklistFolder({
      profileId: ctx.profileId,
      parentId: ctx.parentId || false,
      name: f.name,
      description: f.description,
      order,
      sortingMode: f.sortingMode ?? 'C',
      isPublished: Boolean(f.isPublished),
    })
    log(`${'  '.repeat(depth + 2)}${folder.created ? '+' : '='} checklist ${f.name} (id ${folder.id})`)
    order++

    let entryOrder = 0
    for (const e of f.entries ?? []) {
      if (e.kind === 'franchise') {
        await seedFranchiseGroup(e, { profileId: ctx.profileId, checklistId: folder.id }, entryOrder, depth)
      } else {
        await seedVersionEntry(e, { profileId: ctx.profileId, checklistId: folder.id, franchiseLinkId: false }, entryOrder, depth)
      }
      entryOrder++
    }

    if (f.folders?.length) {
      await seedFolders(f.folders, { profileId: ctx.profileId, parentId: folder.id }, depth + 1)
    }
  }
}

async function seedLists() {
  log('\n── Listas de usuario (espejo de src/mocks/seed/lists.ts) ──')
  for (const u of LISTS_SEED) {
    log(`\n  usuario ${u.login}`)
    const userRes = await ensureResUser(u)
    log(`    ${mark(userRes)} res.users (uid ${userRes.id})`)
    const profileId = await ensureUserProfile(userRes.id)
    await seedFolders(u.folders, { profileId, parentId: false }, 0)
  }
}

/**
 * Deshace `seedLists()`. Borra el PERFIL (`ll.checklist.user`) de cada
 * usuario del seed, nunca las checklists directamente: `checklist_user_id`
 * es `ondelete="cascade"` sobre `ll.checklist.user`, así que borrar el
 * perfil se lleva puestas todas sus checklists (carpetas y sombras, todas
 * tienen `checklist_user_id` seteado, no solo las raíz) y, en cascada desde
 * ahí, sus links (`link_checklist_id` también `cascade`). Tiene que correr
 * ANTES de `resetCatalog()`: `link_franchise_id` es `ondelete="restrict"`,
 * así que mientras existan estos links, borrar las franquicias del seed de
 * catálogo falla.
 */
async function resetLists() {
  log('\n── --reset: borrando listas de usuario ──')
  for (const u of LISTS_SEED) {
    const userIds = await search('res.users', [['login', '=', u.login]])
    if (!userIds.length) continue
    const resUserId = userIds[0]

    const profileIds = await search('ll.checklist.user', [['user_res_user_id', '=', resUserId]])
    if (profileIds.length) {
      await unlink('ll.checklist.user', profileIds)
      log(`  - perfil de ${u.login} (id ${profileIds.join(', ')}) y sus listas`)
    }

    await unlink('res.users', [resUserId])
    log(`  - res.users ${u.login} (id ${resUserId})`)
  }

  // Barrido de perfiles huérfanos: user_res_user_id es ondelete="set null"
  // (no cascade), así que un perfil cuyo res.users se borró sin pasar antes
  // por acá quedaría vivo apuntando a nadie. Mismo patrón que el barrido de
  // imágenes huérfanas de resetCatalog().
  const orphanProfiles = await search('ll.checklist.user', [['user_res_user_id', '=', false]])
  if (orphanProfiles.length) {
    await unlink('ll.checklist.user', orphanProfiles)
    log(`  - ${orphanProfiles.length} perfiles huérfanos (sin res.users)`)
  }
}

/**
 * Guarda de red antes de borrar el catálogo: `link_franchise_id` es
 * `ondelete="restrict"`, así que si queda VIVO un solo `ll.checklist.link`
 * apuntando a una franquicia del seed —de un usuario que `resetLists()` no
 * conoce, o de una corrida rota anterior— `resetCatalog()` moriría con el
 * mensaje genérico de Odoo ("no se puede eliminar (...) referenciado")
 * sin decir cuál registro ni de quién es. Esto lo hace explícito.
 */
async function assertNoBlockingLinks(franchiseIds) {
  if (!franchiseIds.length) return
  const blocking = await execKw(
    'll.checklist.link', 'search_read', [[['link_franchise_id', 'in', franchiseIds]]],
    { fields: ['id', 'link_show_name', 'link_checklist_id'] },
  )
  if (!blocking.length) return

  console.error('\n✖ --reset no puede borrar el catálogo: quedan links que lo referencian (link_franchise_id es ondelete="restrict"):')
  for (const l of blocking) {
    const owner = l.link_checklist_id ? l.link_checklist_id[1] : '(sin checklist)'
    console.error(`   - link ${l.id} "${l.link_show_name}" en checklist "${owner}"`)
  }
  console.error('  Borralos a mano (por ejemplo, desde el backoffice) antes de reintentar --reset.')
  throw new Error('Reset abortado: hay links que bloquean el borrado del catálogo (detalle arriba)')
}

/* ------------------------------------------------------------------ *
 * Imágenes: los SVG de public/mock-images/ van al campo Binary en base64
 * ------------------------------------------------------------------ */

const imageCache = new Map()

async function imageBase64(file) {
  if (!file) return null
  if (imageCache.has(file)) return imageCache.get(file)
  try {
    const buf = await readFile(path.join(ROOT, 'public', 'mock-images', file))
    const b64 = buf.toString('base64')
    imageCache.set(file, b64)
    return b64
  } catch {
    warn(`no se pudo leer public/mock-images/${file} — se omite la imagen`)
    imageCache.set(file, null)
    return null
  }
}

/* ------------------------------------------------------------------ *
 * Log
 * ------------------------------------------------------------------ */

const stats = { created: 0, reused: 0, warnings: 0 }
const log = (msg) => console.log(msg)
const warn = (msg) => {
  stats.warnings++
  console.warn(`  ⚠ ${msg}`)
}
const mark = ({ created }) => {
  if (created) stats.created++
  else stats.reused++
  return created ? '+' : '='
}

/* ------------------------------------------------------------------ *
 * Seed
 * ------------------------------------------------------------------ */

async function seedLanguages() {
  const byCode = {}
  for (const [iso, odooCode] of Object.entries(LANG_BY_CODE)) {
    // active_test:false porque Odoo trae todos los idiomas inactivos por defecto.
    const found = await execKw('res.lang', 'search', [[['code', '=', odooCode]]], {
      limit: 1,
      context: { active_test: false },
    })
    if (found.length) byCode[iso] = found[0]
    else warn(`res.lang "${odooCode}" no existe; los nombres en "${iso}" quedan sin idioma`)
  }
  return byCode
}

async function seedMasters() {
  log('\n── Datos maestros ──')

  const genres = {}
  for (const [name, color] of GENRES) {
    const r = await ensure('ll.checklist.genre', [['genre_name', '=', name]], {
      genre_name: name,
      genre_color: color,
    })
    genres[name] = r.id
    log(`  ${mark(r)} genre ${name}`)
  }

  const platforms = {}
  for (const [name, img] of PLATFORMS) {
    const r = await ensure('ll.checklist.platform', [['platform_name', '=', name]], {
      platform_name: name,
      platform_image_binary: await imageBase64(img),
    })
    platforms[name] = r.id
    log(`  ${mark(r)} platform ${name}`)
  }

  const countries = {}
  for (const [name, img] of COUNTRIES) {
    const r = await ensure('ll.checklist.country', [['country_name', '=', name]], {
      country_name: name,
      country_image_binary: await imageBase64(img),
    })
    countries[name] = r.id
    log(`  ${mark(r)} country ${name}`)
  }

  // ll.checklist.company.type NO tiene reglas en security/administrator.xml, así
  // que ni el admin puede escribirlo. Se intenta y, si Odoo lo rechaza, las
  // compañías se crean sin tipo en vez de abortar el seed.
  const companyTypes = {}
  for (const typeName of [...new Set(COMPANIES.map(([, t]) => t))]) {
    try {
      const r = await ensure('ll.checklist.company.type', [['ct_name', '=', typeName]], {
        ct_name: typeName,
      })
      companyTypes[typeName] = r.id
      log(`  ${mark(r)} company type ${typeName}`)
    } catch (err) {
      warn(`company type "${typeName}" no se pudo crear (${err.odooType || 'error'}): ${firstLine(err.message)}`)
    }
  }

  const companies = {}
  for (const [name, typeName] of COMPANIES) {
    const vals = { company_name: name }
    if (companyTypes[typeName]) vals.company_type_id = companyTypes[typeName]
    const r = await ensure('ll.checklist.company', [['company_name', '=', name]], vals)
    companies[name] = r.id
    log(`  ${mark(r)} company ${name}`)
  }

  return { genres, platforms, countries, companies }
}

/**
 * La identidad de una franquicia/contenido en Odoo es su *nombre principal*
 * (`franchise_main_name_id` / `content_main_name_id`), que el `create()` del
 * modelo fija con el primero de la lista de nombres. `orderedNames` garantiza
 * que ese primero sea el nombre de display, para que buscar por él encuentre
 * siempre el registro — y para que dos contenidos de la misma franquicia no
 * compartan nombre principal (p. ej. "Steins;Gate (VN)" vs. "(Anime)", que
 * tienen el mismo nombre alternativo).
 */
function orderedNames({ name, names }) {
  const idx = names.findIndex(([n]) => n === name)
  if (idx === 0) return names
  if (idx > 0) return [names[idx], ...names.filter((_, i) => i !== idx)]
  return [[name, null], ...names]
}

/** Ids de franquicias cuyo nombre principal es `name` (normalmente 0 o 1). */
async function findFranchiseIds(name) {
  const rows = await searchRead(
    'll.checklist.db.name',
    [['db_name', '=', name], ['db_franchise_id', '!=', false]],
    ['db_franchise_id'],
  )
  const ids = new Set()
  for (const row of rows) {
    const franchiseId = row.db_franchise_id[0]
    const [f] = await execKw('ll.checklist.franchise', 'read', [[franchiseId]], {
      fields: ['franchise_main_name_id'],
    })
    if (f.franchise_main_name_id && f.franchise_main_name_id[1] === name) ids.add(franchiseId)
  }
  return [...ids]
}

async function findContentId(name, franchiseId) {
  const rows = await searchRead(
    'll.checklist.db.name',
    [['db_name', '=', name], ['db_content_id', '!=', false]],
    ['db_content_id'],
  )
  for (const row of rows) {
    const contentId = row.db_content_id[0]
    const [content] = await execKw('ll.checklist.content', 'read', [[contentId]], {
      fields: ['content_franchise_id', 'content_main_name_id'],
    })
    const sameFranchise =
      content.content_franchise_id && content.content_franchise_id[0] === franchiseId
    const isMainName =
      content.content_main_name_id && content.content_main_name_id[1] === name
    if (sameFranchise && isMainName) return contentId
  }
  return null
}

async function seedCatalog(masters, langs) {
  const nameVals = (pairs, key) =>
    pairs.map(([n, iso]) => [
      0, 0, { db_name: n, db_language_id: (iso && langs[iso]) || false, [key]: false },
    ])

  for (const f of FRANCHISES) {
    log(`\n── ${f.name} ──`)

    const existing = await findFranchiseIds(f.name)
    let franchiseId = existing[0] ?? null
    if (existing.length > 1) {
      warn(`${f.name}: hay ${existing.length} franquicias con ese nombre principal (ids ${existing.join(', ')}); se usa la primera`)
    }
    if (franchiseId) {
      stats.reused++
      log(`  = franchise (id ${franchiseId})`)
    } else {
      franchiseId = await create('ll.checklist.franchise', {
        franchise_description: f.description,
        franchise_published: true,
        // El create() del modelo fija franchise_main_name_id con el primero.
        franchise_name_ids: nameVals(orderedNames(f), 'db_franchise_id'),
      })
      stats.created++
      log(`  + franchise (id ${franchiseId})`)
    }

    await seedFranchiseImages(f, franchiseId)

    for (const c of f.contents) {
      let contentId = await findContentId(c.name, franchiseId)
      if (contentId) {
        stats.reused++
        log(`    = content ${c.name}`)
      } else {
        contentId = await create('ll.checklist.content', {
          content_franchise_id: franchiseId,
          content_description: c.description,
          content_abbreviation: c.abbreviation || false,
          content_type: c.type,
          content_video_type: c.videoType || false,
          content_order: c.order,
          content_published: true,
          content_genre_ids: [[6, 0, c.genres.map((g) => masters.genres[g])]],
          content_company_ids: [[6, 0, c.companies.map((x) => masters.companies[x])]],
          content_name_ids: nameVals(orderedNames(c), 'db_content_id'),
        })
        stats.created++
        log(`    + content ${c.name}`)
      }

      for (const ver of c.versions) {
        const r = await ensure(
          'll.checklist.version',
          [['version_name', '=', ver.name], ['version_content_id', '=', contentId]],
          {
            version_content_id: contentId,
            version_name: ver.name,
            version_episodes: ver.episodes,
            version_date: ver.releaseDate,
            version_order: ver.order,
            version_published: true,
            version_country_id: ver.country ? masters.countries[ver.country] : false,
            version_platform_id: ver.platform ? masters.platforms[ver.platform] : false,
            version_dubbing_studio_id: ver.dubbingStudio
              ? masters.companies[ver.dubbingStudio]
              : false,
          },
        )
        log(`      ${mark(r)} version ${ver.name} (${ver.episodes || '?'} eps)`)
      }
    }
  }
}

/**
 * El create() de Franchise crea sola su image.group. Las imágenes cuelgan de
 * ahí, y la portada de la franquicia se apunta con franchise_image_id.
 */
async function seedFranchiseImages(f, franchiseId) {
  const gallery = f.gallery.length ? f.gallery : f.poster ? [['Poster', f.poster]] : []
  if (!gallery.length) return

  const [franchise] = await execKw('ll.checklist.franchise', 'read', [[franchiseId]], {
    fields: ['franchise_image_group_id', 'franchise_image_id'],
  })
  const groupId = franchise.franchise_image_group_id && franchise.franchise_image_group_id[0]
  if (!groupId) {
    warn(`${f.name}: sin image group, se omiten las imágenes`)
    return
  }

  let firstImageId = null
  for (const [imgName, file] of gallery) {
    const b64 = await imageBase64(file)
    if (!b64) continue
    const r = await ensure(
      'll.checklist.image',
      [['image_name', '=', imgName], ['image_group_id', '=', groupId]],
      { image_name: imgName, image_group_id: groupId, image_binary: b64 },
    )
    firstImageId ??= r.id
    log(`    ${mark(r)} image ${imgName}`)
  }

  if (firstImageId && !franchise.franchise_image_id) {
    await write('ll.checklist.franchise', [franchiseId], { franchise_image_id: firstImageId })
  }
}

async function resetCatalog() {
  log('\n── --reset: borrando franquicias del seed ──')

  const idsByFranchise = []
  for (const f of FRANCHISES) {
    const ids = await findFranchiseIds(f.name)
    if (ids.length) idsByFranchise.push({ f, ids })
  }
  await assertNoBlockingLinks(idsByFranchise.flatMap(({ ids }) => ids))

  for (const { f, ids } of idsByFranchise) {
    // El image.group se borra en cascada con la franquicia, pero
    // ll.checklist.image.image_group_id es ondelete="set null": las imágenes
    // sobrevivirían huérfanas y cada reset acumularía basura. Se borran antes.
    const groups = await execKw('ll.checklist.franchise', 'read', [ids], {
      fields: ['franchise_image_group_id'],
    })
    const groupIds = groups
      .map((g) => g.franchise_image_group_id && g.franchise_image_group_id[0])
      .filter(Boolean)
    if (groupIds.length) {
      const imageIds = await search('ll.checklist.image', [['image_group_id', 'in', groupIds]])
      if (imageIds.length) await unlink('ll.checklist.image', imageIds)
    }

    // contents/versions/nombres tienen ondelete="cascade" sobre la franquicia.
    await unlink('ll.checklist.franchise', ids)
    log(`  - ${f.name} (id ${ids.join(', ')})`)
  }

  // Barrido de huérfanas que hayan quedado de corridas anteriores del script.
  const orphans = await search('ll.checklist.image', [['image_group_id', '=', false]])
  if (orphans.length) {
    await unlink('ll.checklist.image', orphans)
    log(`  - ${orphans.length} imágenes huérfanas (sin grupo)`)
  }
}

const firstLine = (s) => String(s).split('\n')[0]

async function main() {
  log(`AniTrack — seed de catálogo`)
  log(`  Odoo: ${CONFIG.url}   DB: ${CONFIG.db}   usuario: ${CONFIG.user}`)

  await authenticate()
  log(`  Autenticado (uid ${uid})`)

  if (RESET) {
    // Las listas van primero: sus links (ondelete="restrict" hacia
    // franquicia) bloquean el borrado del catálogo si siguen vivas.
    await resetLists()
    await resetCatalog()
  }

  const langs = await seedLanguages()
  const masters = await seedMasters()
  await seedCatalog(masters, langs)
  await seedLists()

  const totals = {}
  for (const model of ['franchise', 'content', 'version']) {
    totals[model] = await execKw(`ll.checklist.${model}`, 'search_count', [[]])
  }
  totals.checklist = await execKw('ll.checklist.checklist', 'search_count', [[]])
  totals.link = await execKw('ll.checklist.link', 'search_count', [[]])
  totals.users = await execKw('res.users', 'search_count', [[['login', 'in', LISTS_SEED.map((u) => u.login)]]])

  log('\n── Resumen ──')
  log(`  creados: ${stats.created}   ya existían: ${stats.reused}   warnings: ${stats.warnings}`)
  log(`  en la base: ${totals.franchise} franquicias, ${totals.content} contenidos, ${totals.version} versiones`)
  log(`  listas: ${totals.users} usuarios del seed, ${totals.checklist} checklists (incl. sombras), ${totals.link} links`)
  log(`\n  Verificalo en ${CONFIG.url} → menú "LL Checklist" → Database → Franchise`)
}

main().catch((err) => {
  console.error(`\n✖ ${err.message}`)
  if (err.odooType) console.error(`  (${err.odooType})`)
  process.exit(1)
})
