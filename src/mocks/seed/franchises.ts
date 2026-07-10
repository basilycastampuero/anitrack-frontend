import type {
  FranchiseDetail,
  ContentDetail,
  VersionDetail,
  AltName,
} from '@/features/catalog/types'
import { genre, platform, company, country } from '@/mocks/seed/masters'

let nameId = 1
const alt = (name: string, lang: string | null): AltName => ({
  id: nameId++,
  name,
  languageCode: lang,
})

const poster = (n: number) => `/mock-images/poster-${n}.svg`

type VersionInput = Partial<VersionDetail> &
  Pick<VersionDetail, 'id' | 'name' | 'episodes' | 'releaseDate'>

const version = (v: VersionInput): VersionDetail => ({
  order: v.order ?? 0,
  country: v.country ?? null,
  dubbingStudio: v.dubbingStudio ?? null,
  platform: v.platform ?? null,
  ...v,
})

/**
 * Seed de catálogo alineado 1:1 con el modelo real (ADR-008). Cubre los casos
 * obligatorios: franquicia mixta video+juego, content multi-versión con doblajes
 * en distinto país/plataforma, versión con episodes=0 (en emisión), y película.
 */
export const franchises: FranchiseDetail[] = [
  {
    id: 1,
    name: 'Fullmetal Alchemist',
    alternativeNames: [
      alt('Fullmetal Alchemist', 'en'),
      alt('鋼の錬金術師', 'ja'),
      alt('Hagane no Renkinjutsushi', 'ja'),
    ],
    description:
      'Two brothers search for the Philosopher’s Stone to restore their bodies after a failed alchemical ritual.',
    imageUrl: poster(1),
    gallery: [
      { id: 1, name: 'Key visual', url: poster(1) },
      { id: 2, name: 'Cover', url: poster(2) },
    ],
    gameContents: [],
    videoContents: [
      {
        id: 100,
        name: 'Brotherhood',
        alternativeNames: [alt('Brotherhood', 'en')],
        abbreviation: 'FMAB',
        description: 'The 2009 retelling that follows the manga to its end.',
        imageUrl: poster(1),
        type: 'V',
        videoType: 'TV',
        order: 0,
        genres: [genre(1), genre(2), genre(5)],
        companies: [company(1)],
        versions: [
          version({
            id: 1000,
            name: 'Original Japanese',
            episodes: 64,
            releaseDate: '2009-04-05',
            country: country(1),
            platform: platform(2),
          }),
          version({
            id: 1001,
            name: 'English Dub',
            order: 1,
            episodes: 64,
            releaseDate: '2010-02-13',
            country: country(2),
            dubbingStudio: company(3),
            platform: platform(1),
          }),
        ],
      },
      {
        id: 101,
        name: 'The Sacred Star of Milos',
        alternativeNames: [alt('The Sacred Star of Milos', 'en')],
        abbreviation: null,
        description: 'A feature film set during the Brotherhood timeline.',
        imageUrl: poster(2),
        type: 'V',
        videoType: 'M',
        order: 1,
        genres: [genre(1), genre(5)],
        companies: [company(1)],
        versions: [
          version({
            id: 1002,
            name: 'Movie',
            episodes: 1,
            releaseDate: '2011-07-02',
            country: country(1),
            platform: platform(5),
          }),
        ],
      },
    ],
  },
  {
    id: 2,
    name: 'Pokémon',
    alternativeNames: [
      alt('Pokémon', 'en'),
      alt('ポケモン', 'ja'),
      alt('Pocket Monsters', 'ja'),
    ],
    description:
      'Trainers explore regions, catch creatures, and battle across an ever-expanding world spanning games and anime.',
    imageUrl: poster(3),
    gallery: [{ id: 3, name: 'Key visual', url: poster(3) }],
    gameContents: [
      {
        id: 102,
        name: 'Scarlet',
        alternativeNames: [alt('Pokémon Scarlet', 'en')],
        abbreviation: 'SV',
        description: 'An open-world adventure in the Paldea region.',
        imageUrl: poster(4),
        type: 'G',
        videoType: null,
        order: 0,
        genres: [genre(2), genre(11)],
        companies: [company(2)],
        versions: [
          version({
            id: 1003,
            name: 'Switch',
            episodes: 0,
            releaseDate: '2022-11-18',
            country: country(1),
            platform: platform(3),
          }),
        ],
      },
    ],
    videoContents: [
      {
        id: 103,
        name: 'Pokémon Horizons',
        alternativeNames: [alt('Pokémon Horizons', 'en')],
        abbreviation: 'PH',
        description: 'A new series following Liko and Roy. Currently airing.',
        imageUrl: poster(3),
        type: 'V',
        videoType: 'TV',
        order: 0,
        genres: [genre(2), genre(3)],
        companies: [],
        versions: [
          version({
            id: 1004,
            name: 'Original Japanese',
            episodes: 0, // en emisión -> total desconocido
            releaseDate: '2023-04-14',
            country: country(1),
            platform: platform(2),
          }),
        ],
      },
    ],
  },
  {
    id: 3,
    name: 'Demon Slayer',
    alternativeNames: [
      alt('Demon Slayer', 'en'),
      alt('鬼滅の刃', 'ja'),
      alt('Kimetsu no Yaiba', 'ja'),
    ],
    description:
      'A young man becomes a demon slayer to avenge his family and cure his sister.',
    imageUrl: poster(5),
    gallery: [{ id: 4, name: 'Key visual', url: poster(5) }],
    gameContents: [],
    videoContents: [
      {
        id: 104,
        name: 'Kimetsu no Yaiba',
        alternativeNames: [alt('Kimetsu no Yaiba', 'ja')],
        abbreviation: 'KnY',
        description: 'The animated adaptation by Ufotable.',
        imageUrl: poster(5),
        type: 'V',
        videoType: 'TV',
        order: 0,
        genres: [genre(1), genre(5), genre(4)],
        companies: [company(5)],
        versions: [
          version({
            id: 1005,
            name: 'Season 1 (JP)',
            episodes: 26,
            releaseDate: '2019-04-06',
            country: country(1),
            platform: platform(2),
          }),
          version({
            id: 1006,
            name: 'Season 2 (JP)',
            order: 1,
            episodes: 18,
            releaseDate: '2021-12-05',
            country: country(1),
            platform: platform(2),
          }),
          version({
            id: 1007,
            name: 'Latino Dub',
            order: 2,
            episodes: 26,
            releaseDate: '2020-01-10',
            country: country(3),
            dubbingStudio: company(6),
            platform: platform(1),
          }),
        ],
      },
    ],
  },
  {
    id: 4,
    name: 'The Witcher',
    alternativeNames: [alt('The Witcher', 'en'), alt('Wiedźmin', null)],
    description:
      'Geralt of Rivia, a monster hunter, navigates a morally grey world across games and a live-action series.',
    imageUrl: poster(6),
    gallery: [{ id: 5, name: 'Key visual', url: poster(6) }],
    gameContents: [
      {
        id: 105,
        name: 'The Witcher 3: Wild Hunt',
        alternativeNames: [alt('Wild Hunt', 'en')],
        abbreviation: 'TW3',
        description: 'An open-world RPG following Geralt and Ciri.',
        imageUrl: poster(6),
        type: 'G',
        videoType: null,
        order: 0,
        genres: [genre(11), genre(2), genre(4)],
        companies: [company(4)],
        versions: [
          version({
            id: 1008,
            name: 'PC',
            episodes: 0,
            releaseDate: '2015-05-19',
            country: country(2),
            platform: platform(4),
          }),
        ],
      },
    ],
    videoContents: [
      {
        id: 106,
        name: 'The Witcher (Series)',
        alternativeNames: [alt('The Witcher', 'en')],
        abbreviation: null,
        description: 'The Netflix live-action adaptation.',
        imageUrl: poster(7),
        type: 'V',
        videoType: 'S',
        order: 0,
        genres: [genre(5), genre(2)],
        companies: [],
        versions: [
          version({
            id: 1009,
            name: 'Season 1',
            episodes: 8,
            releaseDate: '2019-12-20',
            country: country(2),
            platform: platform(1),
          }),
        ],
      },
    ],
  },
  {
    id: 5,
    name: 'Your Name',
    alternativeNames: [
      alt('Your Name', 'en'),
      alt('君の名は。', 'ja'),
      alt('Kimi no Na wa', 'ja'),
    ],
    description:
      'Two teenagers share a profound, magical connection as they swap bodies across time and distance.',
    imageUrl: poster(8),
    gallery: [{ id: 6, name: 'Key visual', url: poster(8) }],
    gameContents: [],
    videoContents: [
      {
        id: 107,
        name: 'Kimi no Na wa',
        alternativeNames: [alt('Kimi no Na wa', 'ja')],
        abbreviation: null,
        description: 'Makoto Shinkai’s record-breaking film.',
        imageUrl: poster(8),
        type: 'V',
        videoType: 'M',
        order: 0,
        genres: [genre(9), genre(4), genre(5)],
        companies: [],
        versions: [
          version({
            id: 1010,
            name: 'Movie',
            episodes: 1,
            releaseDate: '2016-08-26',
            country: country(1),
            platform: platform(2),
          }),
        ],
      },
    ],
  },
  {
    id: 6,
    name: 'Cyberpunk: Edgerunners',
    alternativeNames: [alt('Edgerunners', 'en')],
    description:
      'A street kid tries to survive in a technology-obsessed city of the future.',
    imageUrl: poster(2),
    gallery: [],
    gameContents: [],
    videoContents: [
      {
        id: 108,
        name: 'Edgerunners',
        alternativeNames: [alt('Edgerunners', 'en')],
        abbreviation: null,
        description: 'A Studio Trigger ONA set in Night City.',
        imageUrl: poster(2),
        type: 'V',
        videoType: 'ONA',
        order: 0,
        genres: [genre(6), genre(1)],
        companies: [],
        versions: [
          version({
            id: 1011,
            name: 'Original',
            episodes: 10,
            releaseDate: '2022-09-13',
            country: country(1),
            platform: platform(1),
          }),
        ],
      },
    ],
  },
  {
    id: 7,
    name: 'Attack on Titan',
    alternativeNames: [
      alt('Attack on Titan', 'en'),
      alt('進撃の巨人', 'ja'),
      alt('Shingeki no Kyojin', 'ja'),
    ],
    description:
      'Humanity fights for survival against giant humanoid Titans behind enormous walls.',
    imageUrl: poster(4),
    gallery: [],
    gameContents: [],
    videoContents: [
      {
        id: 109,
        name: 'Shingeki no Kyojin',
        alternativeNames: [alt('Shingeki no Kyojin', 'ja')],
        abbreviation: 'AoT',
        description: 'The WIT/MAPPA adaptation.',
        imageUrl: poster(4),
        type: 'V',
        videoType: 'TV',
        order: 0,
        genres: [genre(1), genre(4), genre(8)],
        companies: [],
        versions: [
          version({
            id: 1012,
            name: 'Season 1',
            episodes: 25,
            releaseDate: '2013-04-07',
            country: country(1),
            platform: platform(2),
          }),
          version({
            id: 1013,
            name: 'The Final Season',
            order: 1,
            episodes: 0, // en emisión
            releaseDate: '2020-12-07',
            country: country(1),
            platform: platform(2),
          }),
        ],
      },
    ],
  },
  {
    id: 8,
    name: 'Hollow Knight',
    alternativeNames: [alt('Hollow Knight', 'en')],
    description:
      'A lone knight explores the ruined, insect-filled kingdom of Hallownest.',
    imageUrl: poster(6),
    gallery: [],
    gameContents: [
      {
        id: 110,
        name: 'Hollow Knight',
        alternativeNames: [alt('Hollow Knight', 'en')],
        abbreviation: 'HK',
        description: 'A hand-drawn metroidvania by Team Cherry.',
        imageUrl: poster(6),
        type: 'G',
        videoType: null,
        order: 0,
        genres: [genre(2), genre(5)],
        companies: [],
        versions: [
          version({
            id: 1014,
            name: 'PC',
            episodes: 0,
            releaseDate: '2017-02-24',
            country: country(2),
            platform: platform(4),
          }),
        ],
      },
    ],
    videoContents: [],
  },
  {
    id: 9,
    name: 'Steins;Gate',
    alternativeNames: [
      alt('Steins;Gate', 'en'),
      alt('シュタインズ・ゲート', 'ja'),
    ],
    description:
      'A self-proclaimed mad scientist discovers a way to send messages to the past.',
    imageUrl: poster(7),
    gallery: [],
    gameContents: [
      {
        id: 111,
        name: 'Steins;Gate (VN)',
        alternativeNames: [alt('Steins;Gate', 'en')],
        abbreviation: null,
        description: 'The original visual novel.',
        imageUrl: poster(7),
        type: 'G',
        videoType: null,
        order: 0,
        genres: [genre(6), genre(8)],
        companies: [],
        versions: [
          version({
            id: 1015,
            name: 'PC',
            episodes: 0,
            releaseDate: '2009-10-15',
            country: country(1),
            platform: platform(4),
          }),
        ],
      },
    ],
    videoContents: [
      {
        id: 112,
        name: 'Steins;Gate (Anime)',
        alternativeNames: [alt('Steins;Gate', 'en')],
        abbreviation: 'SG',
        description: 'The White Fox adaptation.',
        imageUrl: poster(7),
        type: 'V',
        videoType: 'TV',
        order: 0,
        genres: [genre(6), genre(8), genre(4)],
        companies: [],
        versions: [
          version({
            id: 1016,
            name: 'Original Japanese',
            episodes: 24,
            releaseDate: '2011-04-06',
            country: country(1),
            platform: platform(2),
          }),
        ],
      },
    ],
  },
  {
    id: 10,
    name: 'Spy x Family',
    alternativeNames: [
      alt('Spy x Family', 'en'),
      alt('スパイファミリー', 'ja'),
    ],
    description:
      'A spy builds a fake family to complete a mission — unaware his wife is an assassin and his daughter a telepath.',
    imageUrl: poster(3),
    gallery: [],
    gameContents: [],
    videoContents: [
      {
        id: 113,
        name: 'Spy x Family',
        alternativeNames: [alt('Spy x Family', 'en')],
        abbreviation: 'SxF',
        description: 'The WIT/CloverWorks comedy.',
        imageUrl: poster(3),
        type: 'V',
        videoType: 'TV',
        order: 0,
        genres: [genre(1), genre(3), genre(7)],
        companies: [],
        versions: [
          version({
            id: 1017,
            name: 'Season 1 (JP)',
            episodes: 25,
            releaseDate: '2022-04-09',
            country: country(1),
            platform: platform(2),
          }),
          version({
            id: 1018,
            name: 'Season 2 (JP)',
            order: 1,
            episodes: 0, // en emisión
            releaseDate: '2023-10-07',
            country: country(1),
            platform: platform(2),
          }),
        ],
      },
    ],
  },
]

/** Todas las versiones aplanadas (para /contents/:id y validación de links). */
export function allContents(): ContentDetail[] {
  return franchises.flatMap((f) => [...f.gameContents, ...f.videoContents])
}
