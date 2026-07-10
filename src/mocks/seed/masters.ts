import type {
  Genre,
  PlatformRef,
  CompanyRef,
  CountryRef,
} from '@/features/catalog/types'

/** Géneros con colorIndex 1–11 (mapea genre_color de Odoo -> GenreBadge). */
export const genres: Genre[] = [
  { id: 1, name: 'Action', colorIndex: 1 },
  { id: 2, name: 'Adventure', colorIndex: 2 },
  { id: 3, name: 'Comedy', colorIndex: 3 },
  { id: 4, name: 'Drama', colorIndex: 4 },
  { id: 5, name: 'Fantasy', colorIndex: 5 },
  { id: 6, name: 'Sci-Fi', colorIndex: 6 },
  { id: 7, name: 'Slice of Life', colorIndex: 7 },
  { id: 8, name: 'Mystery', colorIndex: 8 },
  { id: 9, name: 'Romance', colorIndex: 9 },
  { id: 10, name: 'Horror', colorIndex: 10 },
  { id: 11, name: 'RPG', colorIndex: 11 },
]

const g = (id: number): Genre => genres.find((x) => x.id === id)!

export const genre = g

export const platforms: PlatformRef[] = [
  { id: 1, name: 'Netflix', imageUrl: '/mock-images/platform-netflix.svg' },
  { id: 2, name: 'Crunchyroll', imageUrl: '/mock-images/platform-crunchyroll.svg' },
  { id: 3, name: 'Nintendo Switch', imageUrl: '/mock-images/platform-switch.svg' },
  { id: 4, name: 'Steam', imageUrl: '/mock-images/platform-steam.svg' },
  { id: 5, name: 'Blu-ray', imageUrl: null },
]

const p = (id: number): PlatformRef => platforms.find((x) => x.id === id)!
export const platform = p

export const companies: CompanyRef[] = [
  { id: 1, name: 'Studio Bones', typeName: 'Animation Studio' },
  { id: 2, name: 'Game Freak', typeName: 'Game Developer' },
  { id: 3, name: 'Funimation', typeName: 'Dubbing Studio' },
  { id: 4, name: 'CD Projekt Red', typeName: 'Game Developer' },
  { id: 5, name: 'Ufotable', typeName: 'Animation Studio' },
  { id: 6, name: 'AniLatino', typeName: 'Dubbing Studio' },
]

const c = (id: number): CompanyRef => companies.find((x) => x.id === id)!
export const company = c

export const countries: CountryRef[] = [
  { id: 1, name: 'Japan', imageUrl: '/mock-images/flag-jp.svg', languageCode: 'ja' },
  { id: 2, name: 'United States', imageUrl: '/mock-images/flag-us.svg', languageCode: 'en' },
  { id: 3, name: 'Mexico', imageUrl: '/mock-images/flag-mx.svg', languageCode: 'es' },
]

const co = (id: number): CountryRef => countries.find((x) => x.id === id)!
export const country = co
