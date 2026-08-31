/** Tipos base del dominio de catálogo (doc 05). */

export type ContentType = 'G' | 'V' // Game | Video
export type VideoType = 'C' | 'M' | 'OVA' | 'ONA' | 'S' | 'TV'

/** Únicos valores válidos de cada enum (fuente de verdad para parseo y UI). */
export const CONTENT_TYPES: ContentType[] = ['G', 'V']
export const VIDEO_TYPES: VideoType[] = ['C', 'M', 'OVA', 'ONA', 'S', 'TV']

export const VIDEO_TYPE_LABELS: Record<VideoType, string> = {
  C: 'Compilation',
  M: 'Movie',
  OVA: 'OVA',
  ONA: 'ONA',
  S: 'Special',
  TV: 'TV',
}
