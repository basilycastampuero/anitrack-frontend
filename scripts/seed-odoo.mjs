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
  for (const f of FRANCHISES) {
    const ids = await findFranchiseIds(f.name)
    if (!ids.length) continue

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

  if (RESET) await resetCatalog()

  const langs = await seedLanguages()
  const masters = await seedMasters()
  await seedCatalog(masters, langs)

  const totals = {}
  for (const model of ['franchise', 'content', 'version']) {
    totals[model] = await execKw(`ll.checklist.${model}`, 'search_count', [[]])
  }

  log('\n── Resumen ──')
  log(`  creados: ${stats.created}   ya existían: ${stats.reused}   warnings: ${stats.warnings}`)
  log(`  en la base: ${totals.franchise} franquicias, ${totals.content} contenidos, ${totals.version} versiones`)
  log(`\n  Verificalo en ${CONFIG.url} → menú "LL Checklist" → Database → Franchise`)
}

main().catch((err) => {
  console.error(`\n✖ ${err.message}`)
  if (err.odooType) console.error(`  (${err.odooType})`)
  process.exit(1)
})
