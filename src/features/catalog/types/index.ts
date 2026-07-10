import { type z } from 'zod'
import type {
  genreSchema,
  platformRefSchema,
  companyRefSchema,
  countryRefSchema,
  altNameSchema,
  imageRefSchema,
  versionDetailSchema,
  contentDetailSchema,
  contentDetailWithFranchiseSchema,
  franchiseSummarySchema,
  franchiseDetailSchema,
  searchHitSchema,
} from '@/features/catalog/services/schemas'
import type { ContentType, VideoType } from '@/types/media.types'

export type Genre = z.infer<typeof genreSchema>
export type PlatformRef = z.infer<typeof platformRefSchema>
export type CompanyRef = z.infer<typeof companyRefSchema>
export type CountryRef = z.infer<typeof countryRefSchema>
export type AltName = z.infer<typeof altNameSchema>
export type ImageRef = z.infer<typeof imageRefSchema>
export type VersionDetail = z.infer<typeof versionDetailSchema>
export type ContentDetail = z.infer<typeof contentDetailSchema>
export type ContentDetailWithFranchise = z.infer<
  typeof contentDetailWithFranchiseSchema
>
export type FranchiseSummary = z.infer<typeof franchiseSummarySchema>
export type FranchiseDetail = z.infer<typeof franchiseDetailSchema>
export type SearchHit = z.infer<typeof searchHitSchema>

/** Filtros del catálogo — fuente de verdad en la URL (searchParams). */
export interface CatalogFilters {
  q?: string
  contentType?: ContentType
  videoType?: VideoType
  genreIds?: number[]
  platformIds?: number[]
  yearFrom?: number
  yearTo?: number
  sort?: 'name' | 'releaseDate' | '-releaseDate'
  page?: number
}
